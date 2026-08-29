"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, Skeleton, Tag } from "@/components/ui";
import { IconArrowRight, IconCheck, IconCopy, IconSeal, IconTrash, IconX } from "@/components/icons";
import { proofStore } from "@/lib/proof";
import { getWalletAddress } from "@/lib/session";
import { formatDate, formatRelative, isExpired, shortenMiddle } from "@/lib/format";
import type { Proof } from "@/types";

/**
 * Proofs this wallet has issued.
 *
 * Backed by device-local storage in wave one. Wave two asks the chain instead,
 * which is why the store interface is async — this page does not change.
 */
export default function IssuedProofsPage() {
  const router = useRouter();
  const [proofs, setProofs] = useState<Proof[] | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async (owner: string) => {
    setProofs(await proofStore.listBySubject(owner));
  }, []);

  useEffect(() => {
    const owner = getWalletAddress();
    if (!owner) { router.replace("/student/login"); return; }
    setWallet(owner);
    void load(owner);
  }, [router, load]);

  async function copyLink(proofId: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/verify/${proofId}`);
      setCopied(proofId);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  async function revoke(proofId: string) {
    await proofStore.remove(proofId);
    if (wallet) void load(wallet);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            {wallet ? shortenMiddle(wallet, 16, 6) : " "}
          </p>
          <h1 className="title mt-3 text-4xl">Proofs you have issued</h1>
        </div>
        <Link
          href="/student/create-proof"
          className="focusable inline-flex items-center gap-2 bg-ink px-5 py-3 text-sm font-medium text-paper transition-colors hover:bg-seal-700"
        >
          Build a statement
          <IconArrowRight size={1} />
        </Link>
      </header>

      <p className="max-w-xl text-[15px] leading-relaxed text-ink-soft">
        Each entry is a proof you generated and can share. Revoking one removes it
        from this device — a verifier holding the link will no longer be able to check it.
      </p>

      {proofs === null ? (
        <div className="rows border border-rule bg-surface">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : proofs.length === 0 ? (
        <div className="sheet">
          <EmptyState
            icon={<IconSeal />}
            title="No proofs yet"
            body="Build a statement about your record and generate a proof of it. It takes about ten seconds."
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
      ) : (
        <div className="rows border border-rule bg-surface">
          {proofs.map((p) => {
            const expired = isExpired(p.expiresAt);
            const allProven = p.claims.every((c) => c.satisfied);

            return (
              <article key={p.proofId} className="p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <Link
                    href={`/student/proof/${p.proofId}`}
                    className="focusable mono text-xs text-ink transition-colors hover:text-seal-600"
                  >
                    {p.proofId}
                  </Link>
                  <div className="flex items-center gap-2">
                    {expired ? (
                      <Tag tone="failed">expired</Tag>
                    ) : allProven ? (
                      <Tag tone="proven">all proven</Tag>
                    ) : (
                      <Tag tone="caution">partly proven</Tag>
                    )}
                    <span className="text-xs text-ink-faint">{formatRelative(p.createdAt)}</span>
                  </div>
                </div>

                <ul className="mt-3 space-y-1">
                  {p.claims.map((c) => (
                    <li key={c.statement} className="flex items-baseline gap-2 text-sm">
                      <span className={c.satisfied ? "text-proven" : "text-failed"}>
                        {c.satisfied ? <IconCheck size={0.9} /> : <IconX size={0.9} />}
                      </span>
                      <span className="text-ink-soft">{c.label}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-ink-faint">
                    Credential valid until {formatDate(p.expiresAt)}
                  </span>
                  <div className="flex items-center gap-4 text-sm">
                    <button
                      onClick={() => copyLink(p.proofId)}
                      className="focusable inline-flex items-center gap-1.5 text-ink-soft transition-colors hover:text-seal-600"
                    >
                      {copied === p.proofId ? <IconCheck size={0.95} /> : <IconCopy size={0.95} />}
                      {copied === p.proofId ? "Copied" : "Copy link"}
                    </button>
                    <button
                      onClick={() => revoke(p.proofId)}
                      className="focusable inline-flex items-center gap-1.5 text-ink-faint transition-colors hover:text-failed"
                    >
                      <IconTrash size={0.95} />
                      Revoke
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="border-t border-rule-soft pt-6 text-xs leading-relaxed text-ink-faint">
        Wave two queries this list from the chain rather than from browser storage,
        so proofs follow the wallet rather than the device. Revocation becomes a
        contract call that a verifier can check.
      </p>
    </div>
  );
}
