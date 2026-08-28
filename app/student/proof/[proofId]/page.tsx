"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Panel, Badge, Button, Steps, Skeleton, EmptyState } from "@/components/ui";
import { proofProvider } from "@/lib/proof";
import type { Proof } from "@/types";

const ATTRIBUTE_LABELS: Record<string, string> = {
  status: "Enrolment status",
  gpa: "Exact GPA",
  academicYear: "Exact academic year",
  degree: "Degree",
  major: "Major",
};

export default function ProofResultPage({ params }: { params: Promise<{ proofId: string }> }) {
  const { proofId } = use(params);
  const [proof, setProof] = useState<Proof | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    let alive = true;
    proofProvider.verifyProof(proofId).then((res) => {
      if (!alive) return;
      setProof(res.proof ?? null);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [proofId]);

  useEffect(() => {
    if (typeof window !== "undefined") setShareUrl(`${window.location.origin}/verify/${proofId}`);
  }, [proofId]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const el = document.createElement("textarea");
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 pt-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (!proof) {
    return (
      <div className="mx-auto max-w-2xl pt-6">
        <Panel>
          <EmptyState
            icon="🔍"
            title="Proof not found"
            body="This proof no longer exists in local storage. Proofs in this prototype are saved in the browser that created them."
            action={<Link href="/student/create-proof"><Button>Create a new proof</Button></Link>}
          />
        </Panel>
      </div>
    );
  }

  const allSatisfied = proof.claims.every((c) => c.satisfied);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Steps current={4} labels={["Sign in", "Institution", "Credentials", "Claims", "Proof"]} />

      <Panel className={`p-6 text-center ${allSatisfied ? "border-emerald-200" : "border-amber-200"}`}>
        <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full text-xl ${
          allSatisfied ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {allSatisfied ? "✓" : "!"}
        </div>
        <h1 className="mt-3 text-lg font-semibold text-slate-900">Proof generated</h1>
        <p className="mt-1 text-sm text-slate-600">
          {allSatisfied
            ? "Every selected claim was satisfied."
            : "Some claims were not satisfied — they are reported honestly to the verifier."}
        </p>
        <div className="mono mt-3 text-xs text-slate-500">{proof.proofId}</div>
      </Panel>

      <Panel className="p-6">
        <h2 className="text-sm font-medium text-slate-900">Claims in this proof</h2>
        <ul className="mt-4 space-y-2">
          {proof.claims.map((c) => (
            <li
              key={c.type}
              className={`flex items-center justify-between rounded-xl border p-3.5 ${
                c.satisfied ? "border-emerald-200 bg-emerald-50/60" : "border-rose-200 bg-rose-50/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={c.satisfied ? "text-emerald-600" : "text-rose-600"}>
                  {c.satisfied ? "✓" : "✗"}
                </span>
                <div>
                  <div className="text-sm text-slate-900">{c.label}</div>
                  <div className="mono mt-0.5 text-[11px] text-slate-500">{c.statement}</div>
                </div>
              </div>
              <Badge tone={c.satisfied ? "success" : "danger"}>
                {c.satisfied ? "proven" : "not satisfied"}
              </Badge>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="p-6">
        <h2 className="text-sm font-medium text-slate-900">Not disclosed</h2>
        <p className="mt-1 text-sm text-slate-600">
          These were read to evaluate your claims, but their values are not in the proof.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {proof.withheldAttributes.map((a) => (
            <span key={a} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              🔒 {ATTRIBUTE_LABELS[a] ?? a}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
            🔒 Student ID
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
            🔒 Name
          </span>
        </div>
      </Panel>

      <Panel className="p-6">
        <h2 className="text-sm font-medium text-slate-900">Share with a verifier</h2>
        <p className="mt-1 text-sm text-slate-600">Anyone with this link can check the claims above.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={shareUrl}
            aria-label="Verification URL"
            onFocus={(e) => e.currentTarget.select()}
            className="focusable mono min-w-0 flex-1 rounded-xl border border-line bg-slate-50 px-3 py-2.5 text-xs text-slate-700"
          />
          <Button onClick={copy} variant={copied ? "secondary" : "primary"}>
            {copied ? "✓ Copied" : "Copy link"}
          </Button>
        </div>
        <Link
          href={`/verify/${proof.proofId}`}
          className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline"
        >
          Open the verifier view →
        </Link>
      </Panel>

      <div className="flex justify-between">
        <Link href="/student/create-proof" className="focusable rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
          ← Create another
        </Link>
        <Link href="/student/credentials" className="focusable rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
          My credential
        </Link>
      </div>
    </div>
  );
}
