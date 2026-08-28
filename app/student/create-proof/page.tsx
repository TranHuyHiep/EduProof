"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel, Button, Steps, Skeleton } from "@/components/ui";
import { useStudent } from "@/lib/use-student";
import { CLAIM_CATALOG, proofProvider, statementOf } from "@/lib/proof";
import type { ClaimRequest, ClaimType } from "@/types";

type Draft = { enabled: boolean; operand: string | number };

export default function CreateProofPage() {
  const router = useRouter();
  const { student, loading } = useStudent();

  const [drafts, setDrafts] = useState<Record<ClaimType, Draft>>(() =>
    Object.fromEntries(
      CLAIM_CATALOG.map((c) => [
        c.type,
        { enabled: c.type === "student_status" || c.type === "gpa_threshold", operand: c.defaultOperand },
      ]),
    ) as Record<ClaimType, Draft>,
  );

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading || !student) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 pt-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const selected: ClaimRequest[] = CLAIM_CATALOG.filter((c) => drafts[c.type].enabled).map((c) => ({
    type: c.type,
    attribute: c.attribute,
    operator: c.operator,
    operand: drafts[c.type].operand,
  }));

  async function generate() {
    if (!student || selected.length === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const proof = await proofProvider.generateProof({ student, claims: selected });
      router.push(`/student/proof/${proof.proofId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the proof.");
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Steps current={3} labels={["Sign in", "Institution", "Credentials", "Claims", "Proof"]} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Choose what to prove</h1>
        <p className="mt-1 text-sm text-slate-600">
          Each claim is a statement about your record. The verifier sees whether it holds — never the value.
        </p>
      </div>

      <div className="space-y-3">
        {CLAIM_CATALOG.map((c) => {
          const d = drafts[c.type];
          const set = (patch: Partial<Draft>) =>
            setDrafts((prev) => ({ ...prev, [c.type]: { ...prev[c.type], ...patch } }));

          return (
            <Panel key={c.type} className={`p-4 transition ${d.enabled ? "border-brand-300" : ""}`}>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={d.enabled}
                  onChange={(e) => set({ enabled: e.target.checked })}
                  className="focusable h-4 w-4 accent-[#2557e5]"
                />
                <span className="text-sm font-medium text-slate-900">{c.title}</span>
                {!c.options && <span className="text-sm text-slate-600">{c.defaultOperand}</span>}
              </label>

              {d.enabled && c.options && (
                <div className="mt-3 flex flex-wrap gap-2 pl-7">
                  {c.options.map((opt) => {
                    const on = String(d.operand) === String(opt);
                    return (
                      <button
                        key={String(opt)}
                        onClick={() => set({ operand: opt })}
                        className={`focusable rounded-lg px-3 py-1.5 text-sm transition ${
                          on ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {typeof opt === "number" && c.type === "gpa_threshold" ? opt.toFixed(1) : String(opt)}
                      </button>
                    );
                  })}
                </div>
              )}

              {d.enabled && (
                <div className="mono mt-3 pl-7 text-xs text-slate-500">
                  {statementOf({ type: c.type, attribute: c.attribute, operator: c.operator, operand: d.operand })}
                </div>
              )}
            </Panel>
          );
        })}
      </div>

      <Panel className="bg-slate-50 p-5">
        <div className="text-sm font-medium text-slate-900">
          {selected.length === 0
            ? "No claims selected"
            : `${selected.length} claim${selected.length > 1 ? "s" : ""} will be proven`}
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {selected.length === 0
            ? "Select at least one claim to continue."
            : "Everything else in your record stays private, including the values these claims are checked against."}
        </p>
      </Panel>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/student/credentials" className="focusable rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
          ← Back
        </Link>
        <Button onClick={generate} disabled={selected.length === 0 || generating}>
          {generating ? "Generating proof…" : "Generate proof"}
        </Button>
      </div>

      {generating && (
        <Panel className="p-5">
          <div className="space-y-2 text-xs text-slate-500">
            <div>Preparing private inputs…</div>
            <div>Evaluating claims…</div>
            <div>Producing proof…</div>
          </div>
          <Skeleton className="mt-3 h-2 w-full" />
        </Panel>
      )}
    </div>
  );
}
