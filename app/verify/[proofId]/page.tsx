"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Panel, Badge, Button, Skeleton, EmptyState } from "@/components/ui";
import { proofProvider } from "@/lib/proof";
import type { VerificationResult } from "@/types";

/**
 * Public verifier view. No login.
 *
 * It renders ONLY: validity, issuer, and claim outcomes. It never reads a
 * private attribute value, because `Proof` does not carry one.
 */
export default function VerifyPage({ params }: { params: Promise<{ proofId: string }> }) {
  const { proofId } = use(params);
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    let alive = true;
    proofProvider.verifyProof(proofId).then((r) => { if (alive) setResult(r); });
    return () => { alive = false; };
  }, [proofId]);

  if (!result) {
    return (
      <div className="mx-auto max-w-2xl pt-6">
        <Panel className="p-8">
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">Verifying proof…</p>
        </Panel>
      </div>
    );
  }

  if (!result.valid || !result.proof) {
    return (
      <div className="mx-auto max-w-2xl pt-6">
        <Panel className="border-rose-200">
          <EmptyState
            icon="⚠️"
            title="This proof could not be verified"
            body={result.reason ?? "The proof identifier is not valid."}
            action={
              <>
                <Link href="/verify/demo"><Button variant="secondary">View sample proof</Button></Link>
                <Link href="/student/login"><Button>Create a proof</Button></Link>
              </>
            }
          />
          <div className="mono border-t border-line px-6 py-3 text-center text-xs text-slate-400">
            {proofId}
          </div>
        </Panel>
      </div>
    );
  }

  const proof = result.proof;
  const allSatisfied = proof.claims.every((c) => c.satisfied);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="text-center">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">EduProof</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Credential verification</h1>
      </header>

      <Panel className={`p-7 text-center ${allSatisfied ? "border-emerald-200" : "border-amber-200"}`}>
        <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full text-2xl ${
          allSatisfied ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {allSatisfied ? "✓" : "!"}
        </div>
        <div className={`mt-4 text-lg font-semibold ${allSatisfied ? "text-emerald-700" : "text-amber-700"}`}>
          Proof valid
        </div>
        <p className="mt-1.5 text-sm text-slate-600">
          {allSatisfied
            ? "Every claim below was proven against a credential from a verified issuer."
            : "This proof is authentic, but some claims below were not satisfied."}
        </p>
      </Panel>

      <Panel className="p-6">
        <h2 className="text-sm font-medium text-slate-900">Verified claims</h2>
        <ul className="mt-4 space-y-2">
          {proof.claims.map((c) => (
            <li
              key={c.type}
              className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${
                c.satisfied ? "border-emerald-200 bg-emerald-50/60" : "border-rose-200 bg-rose-50/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-lg ${c.satisfied ? "text-emerald-600" : "text-rose-600"}`}>
                  {c.satisfied ? "✓" : "✗"}
                </span>
                <span className="text-sm text-slate-900">{c.label}</span>
              </div>
              <Badge tone={c.satisfied ? "success" : "danger"}>
                {c.satisfied ? "proven" : "not satisfied"}
              </Badge>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="p-6">
        <h2 className="text-sm font-medium text-slate-900">Issuer</h2>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-slate-900">{proof.issuer.schoolName}</div>
            <div className="mono mt-0.5 text-xs text-slate-500">{proof.issuer.keyId}</div>
          </div>
          {proof.issuer.verified && <Badge tone="success">✓ Verified issuer</Badge>}
        </div>
      </Panel>

      <Panel className="border-slate-200 bg-slate-50/70 p-6">
        <div className="flex items-center gap-2">
          <span>🔒</span>
          <h2 className="text-sm font-medium text-slate-900">Withheld from this page</h2>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          The student proved the claims above without disclosing:
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {["Exact GPA", "Student ID", "Full name", "Complete transcript", "Enrolment history", "Any unselected claim"].map((x) => (
            <li key={x} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-500 ring-1 ring-slate-200">
              <span className="text-slate-400">🔒</span>
              {x}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="p-6">
        <h2 className="text-sm font-medium text-slate-900">Proof details</h2>
        <dl className="mt-3 space-y-2.5 text-xs">
          {[
            ["Proof ID", proof.proofId],
            ["Subject", proof.subject],
            ["Issued", new Date(proof.createdAt).toLocaleString()],
            ["Credential valid until", proof.expiresAt],
            ["Provider", proof.provider],
          ].map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4">
              <dt className="text-slate-500">{k}</dt>
              <dd className="mono break-all text-right text-slate-700">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <p className="no-print pb-6 text-center text-xs text-slate-500">
        The subject handle is opaque and cannot be traced back to a student ID.
      </p>
    </div>
  );
}
