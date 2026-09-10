"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Skeleton, Steps } from "@/components/ui";
import {
  IconAlert, IconArrowLeft, IconArrowRight, IconCheck, IconLock, IconPlus, IconTrash, IconX,
} from "@/components/icons";
import { useStudent } from "@/lib/use-student";
import { getWalletAddress } from "@/lib/session";
import { providerName } from "@/lib/midnight/config";
import { publishErrorMessage } from "@/lib/midnight/errors";
import { connectWallet, installedWallets } from "@/lib/wallet";
import { useWallet } from "@/lib/wallet-context";
import {
  ATTRIBUTES, attributeSpec, contradictions, defaultClaim, evaluateClaim,
  isDuplicate, operatorPhrase, PRESETS, proofProvider, proofStore, sentenceOf, valueLabel,
} from "@/lib/proof";
import type { ClaimOperator, ClaimRequest, PrivateAttribute, Proof } from "@/types";

// Only midnight's provider publishes; the mock has no chain to reach, so it
// never leaves "proving". Kept alongside the page, not in lib/proof, since a
// WalletConnectedAPI is a UI/wallet concern the ProofProvider interface
// deliberately does not know about — see docs/15-wave-1-smartcontract-call.md.
type GenerateState =
  | { stage: "idle" }
  | { stage: "connecting" }
  | { stage: "proving" }
  | { stage: "publishing"; index: number; total: number }
  /** `proofId` is set only when the proof exists but publishing it failed. */
  | { stage: "error"; message: string; proofId?: string };

export default function CreateProofPage() {
  const router = useRouter();
  const { student, loading } = useStudent();
  const { wallet, setWallet } = useWallet();

  const [claims, setClaims] = useState<ClaimRequest[]>(() => PRESETS[1].claims);
  const [activePreset, setActivePreset] = useState<string | null>(PRESETS[1].id);
  const [state, setState] = useState<GenerateState>({ stage: "idle" });
  const generating = state.stage !== "idle" && state.stage !== "error";

  // Which claims would come back false — worth knowing before spending a proof.
  const outcomes = useMemo(
    () => (student ? claims.map((c) => evaluateClaim(student, c)) : []),
    [student, claims],
  );
  const failing = outcomes.filter((o) => !o.satisfied);
  const conflicts = useMemo(() => contradictions(claims), [claims]);

  const withheld = useMemo(() => {
    const used = new Set(claims.map((c) => c.attribute));
    return ATTRIBUTES.filter((a) => used.has(a.id)).map((a) => a.withheldLabel);
  }, [claims]);

  if (loading || !student) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 pt-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  function update(index: number, patch: Partial<ClaimRequest>) {
    setActivePreset(null);
    setClaims((rows) =>
      rows.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...patch };
        // Switching attribute invalidates the operator and value beside it.
        if (patch.attribute && patch.attribute !== row.attribute) {
          return defaultClaim(patch.attribute);
        }
        return next;
      }),
    );
  }

  function addRow() {
    const unused = ATTRIBUTES.find((a) => !claims.some((c) => c.attribute === a.id));
    const candidate = defaultClaim((unused?.id ?? ATTRIBUTES[0].id) as PrivateAttribute);
    if (claims.some((c) => isDuplicate(c, candidate))) return;
    setActivePreset(null);
    setClaims((rows) => [...rows, candidate]);
  }

  async function generate() {
    if (!student || claims.length === 0) return;
    const owner = getWalletAddress();
    if (!owner) { router.replace("/student/login"); return; }

    setState({ stage: "idle" }); // clears a previous error before trying again

    // Publishing needs the real WalletConnectedAPI (balanceUnsealedTransaction,
    // submitTransaction) — a demo wallet has none, and if the page was
    // reloaded since connecting, the context has forgotten it too (it is not
    // persisted — see lib/wallet-context.tsx). Resolved once, up front: mock
    // never publishes, so it never needs a wallet at all.
    let walletApi = wallet?.api;
    if (providerName() === "midnight" && !walletApi) {
      setState({ stage: "connecting" });
      try {
        const wallets = installedWallets();
        if (wallets.length === 0) {
          throw new Error("No Midnight wallet extension found. Install Lace to generate a proof.");
        }
        const connection = await connectWallet();
        setWallet(connection);
        walletApi = connection.api;
        if (!walletApi) throw new Error("Connected, but no signing API was returned.");
      } catch (e) {
        // publishErrorMessage, not (e as Error).message: a wallet extension
        // can reject with something that is not an Error, and reading
        // .message off that renders an empty notice — indistinguishable, to
        // the student, from the button having done nothing.
        setState({ stage: "error", message: publishErrorMessage(e) });
        return;
      }
    }

    setState({ stage: "proving" });
    let proof: Proof;
    try {
      proof = await proofProvider.generateProof({ student, claims, owner });
    } catch (e) {
      setState({ stage: "error", message: publishErrorMessage(e) });
      return;
    }

    if (providerName() === "midnight" && walletApi) {
      const api = walletApi;
      const { MidnightProofProvider } = await import("@/lib/proof/midnight-provider");
      const provider = new MidnightProofProvider();

      for (let i = 0; i < proof.claims.length; i++) {
        setState({ stage: "publishing", index: i + 1, total: proof.claims.length });
        try {
          const result = await provider.publishProof(student, proof, i, api);
          proof = {
            ...proof,
            claims: proof.claims.map((c, j) => (j === i ? { ...c, publishedTxId: result.txId } : c)),
          };
          await proofStore.save(proof);
        } catch (e) {
          // Shown here, on the page the student is looking at, rather than
          // navigating away with it. An earlier version pushed straight to the
          // proof page on any failure, which discarded the message and left
          // the button looking like it had done nothing — the publish path
          // reports which step failed precisely so that it can be read.
          //
          // Nothing already published is lost: the proof, with whichever
          // claims made it on chain, is saved, and the proof page's own
          // "Publish on chain" button retries exactly the claims that did not.
          setState({
            stage: "error",
            message: publishErrorMessage(e),
            proofId: proof.proofId,
          });
          return;
        }
      }
    }

    router.push(`/student/proof/${proof.proofId}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <Steps current={2} labels={["Connect", "Credential", "Statements", "Proof"]} />

      <header>
        <p className="eyebrow">Selective disclosure</p>
        <h1 className="title mt-3 text-4xl">Build a statement</h1>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-soft">
          Each statement is made of three parts — subject, comparison, value. The
          verifier learns whether it holds, never the value behind it.
        </p>
      </header>

      {/* Presets ------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow">Start from</span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => { setActivePreset(p.id); setClaims(p.claims); }}
            title={p.context}
            aria-pressed={activePreset === p.id}
            className={`focusable border px-3 py-1.5 text-xs transition-colors ${
              activePreset === p.id
                ? "border-seal-500 bg-seal-50 text-seal-600"
                : "border-rule bg-surface text-ink-soft hover:border-ink-faint hover:text-seal-600"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Builder ------------------------------------------------------- */}
      <div className="sheet">
        <div className="rows">
          {claims.map((claim, i) => (
            <ClaimRow
              key={`${claim.attribute}-${i}`}
              claim={claim}
              satisfied={outcomes[i]?.satisfied ?? true}
              onChange={(patch) => update(i, patch)}
              onRemove={claims.length > 1 ? () => { setActivePreset(null); setClaims((r) => r.filter((_, j) => j !== i)); } : undefined}
            />
          ))}

          <button
            onClick={addRow}
            disabled={claims.length >= ATTRIBUTES.length}
            className="focusable flex w-full items-center justify-center gap-1.5 py-3.5 text-sm text-ink-faint transition-colors hover:text-seal-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconPlus size={0.95} />
            Add a statement
          </button>
        </div>

        {/* Preview ----------------------------------------------------- */}
        <div className="border-t border-rule bg-paper-deep/50 p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <div className="eyebrow">The verifier will see</div>
              <ul className="mt-2.5 space-y-1.5">
                {claims.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-[15px] text-ink">
                    <span className={outcomes[i]?.satisfied ? "text-proven" : "text-caution"}>
                      {outcomes[i]?.satisfied ? <IconCheck size={1.05} /> : <IconX size={1.05} />}
                    </span>
                    {sentenceOf(c).replace(/^My /, "")}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="eyebrow">Stays private</div>
              <ul className="mt-2.5 space-y-1.5">
                {withheld.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-[15px] text-ink-faint">
                    <IconLock size={1.05} className="mt-px" />
                    {w}
                  </li>
                ))}
                <li className="flex items-start gap-2 text-[15px] text-ink-faint">
                  <IconLock size={1.05} className="mt-px" />
                  Your name and student ID
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings ------------------------------------------------------ */}
      {conflicts.map((c) => (
        <Notice key={c} tone="amber" text={c} />
      ))}
      {failing.length > 0 && conflicts.length === 0 && (
        <Notice
          tone="amber"
          text={`${failing.length === 1 ? "One statement does" : `${failing.length} statements do`} not hold for your record. You can still generate the proof — the verifier will see them marked as not proven.`}
        />
      )}
      {state.stage === "error" && (
        <div className="space-y-2">
          <Notice tone="rose" text={state.message} />
          {state.proofId && (
            // The proof itself was made and saved; only putting it on chain
            // failed. Offering the way through means a failed publish does not
            // cost the student the proof.
            <Link
              href={`/student/proof/${state.proofId}`}
              className="focusable inline-flex items-center gap-1.5 text-sm text-ink-soft underline decoration-rule underline-offset-4 transition-colors hover:text-seal-600"
            >
              The proof was created — open it to retry publishing
              <IconArrowRight size={0.95} />
            </Link>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Link
          href="/student/credentials"
          className="focusable inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-seal-600"
        >
          <IconArrowLeft size={1} />
          Back
        </Link>
        <Button
          onClick={generate}
          disabled={generating || claims.length === 0}
          className={generating ? "working" : ""}
        >
          {generateButtonLabel(state, providerName() === "midnight")}
        </Button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- row --- */

function ClaimRow({
  claim, satisfied, onChange, onRemove,
}: {
  claim: ClaimRequest;
  satisfied: boolean;
  onChange: (patch: Partial<ClaimRequest>) => void;
  onRemove?: () => void;
}) {
  const spec = attributeSpec(claim.attribute);

  return (
    <div
      className={`rise flex flex-wrap items-center gap-2 p-3.5 transition-colors sm:flex-nowrap ${
        satisfied ? "" : "bg-caution-bg"
      }`}
    >
      <Select
        value={claim.attribute}
        onChange={(v) => onChange({ attribute: v as PrivateAttribute })}
        className="min-w-[9.5rem] flex-1"
      >
        {ATTRIBUTES.map((a) => (
          <option key={a.id} value={a.id}>{a.subject}</option>
        ))}
      </Select>

      <Select
        value={claim.operator}
        onChange={(v) => onChange({ operator: v as ClaimOperator })}
        className="min-w-[7.5rem]"
      >
        {spec.operators.map((op) => (
          <option key={op} value={op}>{operatorPhrase(op, spec.kind)}</option>
        ))}
      </Select>

      {spec.kind === "enum" ? (
        <Select
          value={String(claim.operand)}
          onChange={(v) => onChange({ operand: v })}
          className="min-w-[9rem] flex-1"
        >
          {spec.options?.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
          ))}
        </Select>
      ) : (
        <NumberValue spec={spec} value={Number(claim.operand)} onChange={(n) => onChange({ operand: n })} />
      )}

      {onRemove && (
        <button
          onClick={onRemove}
          aria-label="Remove this statement"
          className="focusable p-2 text-ink-faint transition-colors hover:text-failed"
        >
          <IconTrash size={1} />
        </button>
      )}
    </div>
  );
}

function NumberValue({
  spec, value, onChange,
}: {
  spec: ReturnType<typeof attributeSpec>;
  value: number;
  onChange: (n: number) => void;
}) {
  const { min, max } = spec.range ?? { min: 0, max: 10 };

  // The field keeps whatever was typed while it is being typed. Deriving it
  // from `value` instead would rewrite "3." to 3 mid-keystroke, and an empty
  // field would read back as 0 — silently turning the claim into "at least 0".
  const [draft, setDraft] = useState<string | null>(null);

  // `type="number"` renders through the OS locale, so a machine set to a
  // comma decimal shows "3,5" for 3.5. A text field keeps one notation.
  function commit(raw: string) {
    setDraft(raw);
    const n = Number(raw);
    if (raw.trim() === "" || Number.isNaN(n)) return; // wait for a usable number
    onChange(Math.min(max, Math.max(min, n)));
  }

  return (
    <div className="flex min-w-[9rem] flex-1 items-center gap-2">
      <input
        type="text"
        inputMode="decimal"
        value={draft ?? valueLabel(spec, value)}
        aria-label={spec.subject}
        onChange={(e) => commit(e.target.value)}
        onBlur={() => setDraft(null)}
        className="focusable w-20 border border-rule bg-surface px-2.5 py-2 text-sm tabular-nums text-ink"
      />
      {spec.suggestions && (
        <div className="flex flex-wrap gap-1">
          {spec.suggestions.map((s) => (
            <button
              key={s}
              onClick={() => { setDraft(null); onChange(s); }}
              className={`focusable border px-2 py-1 text-xs tabular-nums transition-colors ${
                Number(value) === s
                  ? "border-seal-500 bg-seal-50 text-seal-600"
                  : "border-rule text-ink-faint hover:border-ink-faint"
              }`}
            >
              {valueLabel(spec, s)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Select({
  value, onChange, children, className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`focusable border border-rule bg-surface px-2.5 py-2 text-sm text-ink ${className}`}
    >
      {children}
    </select>
  );
}

function Notice({ tone, text }: { tone: "amber" | "rose"; text: string }) {
  const styles = {
    amber: "border-caution/25 bg-caution-bg text-caution",
    rose: "border-failed/25 bg-failed-bg text-failed",
  }[tone];

  return (
    <div className={`flex items-start gap-2.5 border px-4 py-3 text-sm ${styles}`} role="alert">
      <IconAlert size={1.1} className="mt-px shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function generateButtonLabel(state: GenerateState, isMidnight: boolean): string {
  switch (state.stage) {
    case "connecting":
      return "Connecting to your wallet…";
    case "proving":
      return "Proving…";
    case "publishing":
      return `Publishing ${state.index} of ${state.total}…`;
    default:
      return isMidnight ? "Generate & publish on chain" : "Generate proof";
  }
}
