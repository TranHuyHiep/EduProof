"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowRight, IconSearch } from "@/components/icons";
import { parseProofReference } from "@/lib/proof/lookup";
import { formatRelative } from "@/lib/format";

const HISTORY_KEY = "eduproof.verify.history.v1";
const HISTORY_MAX = 6;

interface Visit { proofId: string; at: string }

/** Where a verifier arrives holding a link, an id, or nothing at all. */
export default function VerifyLookupPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Visit[]>([]);

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as Visit[]);
    } catch {
      /* unreadable history is not worth surfacing */
    }
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const { proofId, error: parseError } = parseProofReference(input);
    if (!proofId) { setError(parseError); return; }

    try {
      const next = [
        { proofId, at: new Date().toISOString() },
        ...history.filter((v) => v.proofId !== proofId),
      ].slice(0, HISTORY_MAX);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — the lookup still works */
    }

    router.push(`/verify/${proofId}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <header>
        <p className="eyebrow">Verification</p>
        <h1 className="title mt-3 text-4xl">Check a proof</h1>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-soft">
          Paste the link a student sent you, or the reference on its own. No account,
          and nothing to store afterwards.
        </p>
      </header>

      <form onSubmit={submit}>
        <label htmlFor="reference" className="eyebrow">
          Proof link or reference
        </label>
        <div className="mt-3 flex flex-wrap items-stretch gap-3">
          <div className="relative min-w-[16rem] flex-1">
            <IconSearch
              size={1}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              id="reference"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(null); }}
              placeholder="https://…/verify/pf_a1b2c3  or  pf_a1b2c3"
              autoComplete="off"
              spellCheck={false}
              className="focusable mono w-full border border-rule bg-surface py-3 pl-10 pr-3 text-xs text-ink placeholder:text-ink-faint"
            />
          </div>
          <button
            type="submit"
            className="focusable inline-flex items-center gap-2 bg-ink px-5 text-sm font-medium text-paper transition-colors hover:bg-seal-700"
          >
            Check
            <IconArrowRight size={1} />
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-failed">{error}</p>
        )}
      </form>

      {history.length > 0 && (
        <section>
          <h2 className="eyebrow rule pb-2">Recently checked</h2>
          <div className="rows">
            {history.map((v) => (
              <Link
                key={v.proofId}
                href={`/verify/${v.proofId}`}
                className="focusable group flex items-baseline justify-between gap-4 py-3"
              >
                <span className="mono text-xs text-ink">{v.proofId}</span>
                <span className="flex items-baseline gap-3">
                  <span className="text-xs text-ink-faint">{formatRelative(v.at)}</span>
                  <IconArrowRight
                    size={0.9}
                    className="translate-y-0.5 text-rule transition-colors group-hover:text-seal-600"
                  />
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            This list is kept in your browser and never sent anywhere.
          </p>
        </section>
      )}

      <section className="border-t border-rule-soft pt-8">
        <h2 className="eyebrow">What you will and will not see</h2>
        <div className="mt-4 grid gap-x-10 gap-y-3 text-[15px] sm:grid-cols-2">
          <div>
            <p className="text-ink">Each statement, and whether it holds</p>
            <p className="mt-1 text-sm text-ink-soft">
              The institution that signed the record, and when.
            </p>
          </div>
          <div>
            <p className="text-ink-faint">Never the values behind them</p>
            <p className="mt-1 text-sm text-ink-faint">
              No grade average, no name, no student ID, no transcript.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
