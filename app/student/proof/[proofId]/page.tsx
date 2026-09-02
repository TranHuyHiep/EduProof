"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ClaimLine, EmptyState, Entry, Skeleton } from "@/components/ui";
import { Seal } from "@/components/seal";
import { IconAlert, IconArrowRight, IconCopy, IconCheck, IconLock } from "@/components/icons";
import { ATTRIBUTES, proofStore } from "@/lib/proof";
import { formatDate, formatDateTime } from "@/lib/format";
import { explorerTxUrl, midnightConfig, providerName } from "@/lib/midnight/config";
import { connectWallet, installedWallets } from "@/lib/wallet";
import { useWallet } from "@/lib/wallet-context";
import { useStudent } from "@/lib/use-student";
import type { Proof } from "@/types";

// "waiting-wallet" covers signing AND block confirmation: publishProof()
// awaits the whole chain internally (balance, sign, submit, watchForTxData)
// as one call, so there is no observable moment between "sent to wallet" and
// "confirmed" to report as a separate stage without faking progress.
type PublishState =
  | { stage: "idle" }
  | { stage: "connecting" }
  | { stage: "building" }
  | { stage: "waiting-wallet" }
  | { stage: "done"; txId: string }
  | { stage: "error"; message: string };

/** The student's own view of a proof they just issued, with the share link. */
export default function IssuedProofPage({
  params,
}: { params: Promise<{ proofId: string }> }) {
  const { proofId } = use(params);
  const [proof, setProof] = useState<Proof | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState("");
  const { student } = useStudent();
  const { wallet, setWallet } = useWallet();
  const [publish, setPublish] = useState<Record<number, PublishState>>({});

  useEffect(() => {
    setLink(`${window.location.origin}/verify/${proofId}`);
    proofStore.read(proofId).then(setProof);
  }, [proofId]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the link is selectable on screen either way */
    }
  }

  /** docs/22-lessons.md §6 — messages keyed by the Substrate custom error code. */
  function errorMessage(err: unknown): string {
    const raw = err instanceof Error ? err.message : String(err);
    const code = /Custom error:?\s*(\d+)/i.exec(raw)?.[1];
    switch (code) {
      case "170":
        return "Your wallet is still syncing. Try again in a few minutes.";
      case "173":
        return "Not enough DUST to cover the fee.";
      case "174":
        return "Something went wrong building the transaction — this has been logged.";
      default:
        return raw;
    }
  }

  async function publishClaim(claimIndex: number) {
    if (!student || !proof) return;
    setPublish((p) => ({ ...p, [claimIndex]: { stage: "connecting" } }));
    try {
      // Publishing needs the real WalletConnectedAPI (balanceUnsealedTransaction,
      // submitTransaction) — a demo wallet has none, and if the page was
      // reloaded since connecting, the context has forgotten it too (it is
      // not persisted — see lib/wallet-context.tsx). Either way, connect for
      // real here rather than silently doing without.
      let api = wallet?.api;
      if (!api) {
        const wallets = installedWallets();
        if (wallets.length === 0) {
          throw new Error("No Midnight wallet extension found. Install Lace to publish on chain.");
        }
        const connection = await connectWallet();
        setWallet(connection);
        api = connection.api;
        if (!api) throw new Error("Connected, but no signing API was returned.");
      }

      setPublish((p) => ({ ...p, [claimIndex]: { stage: "building" } }));
      const { MidnightProofProvider } = await import("@/lib/proof/midnight-provider");
      const provider = new MidnightProofProvider();

      setPublish((p) => ({ ...p, [claimIndex]: { stage: "waiting-wallet" } }));
      const result = await provider.publishProof(student, proof, claimIndex, api);

      setPublish((p) => ({ ...p, [claimIndex]: { stage: "done", txId: result.txId } }));
    } catch (err) {
      setPublish((p) => ({ ...p, [claimIndex]: { stage: "error", message: errorMessage(err) } }));
    }
  }

  if (proof === undefined) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="mx-auto h-32 w-32 rounded-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (proof === null) {
    return (
      <div className="mx-auto max-w-xl sheet">
        <EmptyState
          icon={<IconAlert />}
          title="Proof not found"
          body="Nothing on this device matches that reference."
          action={
            <Link
              href="/student/create-proof"
              className="focusable bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-seal-700"
            >
              Build a statement
            </Link>
          }
        />
      </div>
    );
  }

  const allProven = proof.claims.every((c) => c.satisfied);
  const withheld = ATTRIBUTES.filter((a) => proof.withheldAttributes.includes(a.id));

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <header className="rise flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left">
        <Seal proofId={proof.proofId} valid={allProven} />
        <div>
          <p className="eyebrow">Proof issued</p>
          <h1 className="title mt-2 text-4xl">
            {allProven ? "Ready to share" : "Issued with exceptions"}
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
            {allProven
              ? "Every statement holds. Anyone with the link below can check them."
              : "Some statements did not hold. The verifier will see them marked as not proven."}
          </p>
        </div>
      </header>

      {/* Share link — the primary action on this page. */}
      <section>
        <h2 className="eyebrow rule pb-2">Share with a verifier</h2>
        <div className="mt-4 flex flex-wrap items-stretch gap-3">
          <code className="mono flex-1 overflow-x-auto whitespace-nowrap border border-rule bg-surface px-4 py-3 text-xs text-ink-soft">
            {link}
          </code>
          <button
            onClick={copy}
            className="focusable inline-flex items-center gap-2 bg-ink px-5 text-sm font-medium text-paper transition-colors hover:bg-seal-700"
          >
            {copied ? <IconCheck size={1} /> : <IconCopy size={1} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          The link reveals only what is listed below. In this prototype it opens on
          this device only; wave two records proofs on chain so any link works anywhere.
        </p>
      </section>

      <section>
        <h2 className="eyebrow rule pb-2">Statements in this proof</h2>
        <div className="rows">
          {proof.claims.map((c) => (
            <ClaimLine key={c.statement} label={c.label} satisfied={c.satisfied} />
          ))}
        </div>
      </section>

      {providerName() === "midnight" && (
        <section>
          <h2 className="eyebrow rule pb-2">Publish on chain</h2>
          <p className="pt-4 text-sm leading-relaxed text-ink-soft">
            The check above ran locally, at no cost. Publishing runs the same circuit
            again as a real transaction, signed by your wallet — it costs DUST and
            takes a block or two.
          </p>
          <div className="rows mt-2">
            {proof.claims.map((c, i) => {
              const state = publish[i] ?? { stage: "idle" as const };
              return (
                <div key={c.statement} className="flex items-center justify-between gap-4 py-3">
                  <span className="text-[15px] leading-snug text-ink">{c.label}</span>
                  {state.stage === "idle" || state.stage === "error" ? (
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <button
                        onClick={() => publishClaim(i)}
                        className="focusable border border-rule px-4 py-2 text-xs text-ink transition-colors hover:border-ink-faint"
                      >
                        Publish on chain
                      </button>
                      {state.stage === "error" && (
                        <span role="alert" className="max-w-xs text-right text-xs text-failed">
                          {state.message}
                        </span>
                      )}
                    </div>
                  ) : state.stage === "done" ? (
                    <a
                      href={explorerTxUrl(state.txId)}
                      target="_blank"
                      rel="noreferrer"
                      className="focusable shrink-0 text-xs uppercase tracking-wider text-proven underline decoration-rule underline-offset-4"
                    >
                      Published — view transaction
                    </a>
                  ) : (
                    <span className="working shrink-0 border border-rule px-4 py-2 text-xs text-ink-soft">
                      {state.stage === "connecting" && "Connecting to your wallet…"}
                      {state.stage === "building" && "Building transaction…"}
                      {state.stage === "waiting-wallet" && "Waiting for confirmation…"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="eyebrow rule pb-2">Not disclosed</h2>
        <p className="pt-4 text-sm leading-relaxed text-ink-soft">
          These were read to evaluate your statements. Their values are not in the proof.
        </p>
        <ul className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {[...withheld.map((w) => w.withheldLabel), "Full name", "Student ID"].map((item) => (
            <li key={item} className="flex items-baseline gap-2.5 text-[15px] text-ink-faint">
              <IconLock size={0.9} className="translate-y-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="eyebrow rule pb-2">Register</h2>
        <dl className="rows pt-1">
          <Entry label="Proof reference" value={proof.proofId} mono />
          <Entry label="Issued" value={formatDateTime(proof.createdAt)} />
          <Entry label="Credential valid until" value={formatDate(proof.expiresAt)} />
        </dl>
      </section>

      <footer className="rule-soft flex flex-wrap items-center justify-between gap-4 border-t pt-6">
        <Link
          href="/student/proofs"
          className="focusable text-sm text-ink-soft underline decoration-rule underline-offset-4 transition-colors hover:text-seal-600"
        >
          All proofs you have issued
        </Link>
        <Link
          href={`/verify/${proof.proofId}`}
          className="focusable inline-flex items-center gap-2 border border-rule px-4 py-2.5 text-sm text-ink transition-colors hover:border-ink-faint"
        >
          See the verifier&rsquo;s view
          <IconArrowRight size={0.95} />
        </Link>
      </footer>
    </div>
  );
}
