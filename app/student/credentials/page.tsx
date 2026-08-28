"use client";
import Link from "next/link";
import { useState } from "react";
import { Panel, Badge, StatusBadge, Button, Steps, Skeleton } from "@/components/ui";
import { getSchool } from "@/lib/data";
import { useStudent } from "@/lib/use-student";

export default function CredentialsPage() {
  const { student, loading } = useStudent();
  const [revealGpa, setRevealGpa] = useState(false);

  if (loading || !student) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 pt-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const school = getSchool(student.schoolId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Steps current={2} labels={["Sign in", "Institution", "Credentials", "Claims", "Proof"]} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My academic credential</h1>
        <p className="mt-1 text-sm text-slate-600">
          Issued by {school?.name}. Visible to you alone — verifiers receive claims, never this record.
        </p>
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-slate-50 px-6 py-4">
          <div>
            <div className="text-base font-semibold text-slate-900">{student.name}</div>
            <div className="mono mt-0.5 text-xs text-slate-500">{student.id}</div>
          </div>
          <div className="flex items-center gap-2">
            {school?.verified && <Badge tone="success">✓ Verified issuer</Badge>}
            <StatusBadge status={student.status} />
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 p-6 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</dt>
            <dd className="mt-1"><StatusBadge status={student.status} /></dd>
          </div>

          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">GPA</dt>
            <dd className="mt-1 flex items-center gap-2">
              <span className={`text-sm tabular-nums ${revealGpa ? "text-slate-900" : "select-none text-slate-400 blur-[5px]"}`}>
                {student.gpa.toFixed(2)}
              </span>
              <button
                onClick={() => setRevealGpa((v) => !v)}
                className="focusable rounded text-xs font-medium text-brand-600 hover:underline"
              >
                {revealGpa ? "Hide" : "Show"}
              </button>
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Academic year</dt>
            <dd className="mt-1 text-sm text-slate-900">Year {student.academicYear}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Degree</dt>
            <dd className="mt-1 text-sm text-slate-900">{student.degree}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Major</dt>
            <dd className="mt-1 text-sm text-slate-900">{student.major}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Valid until</dt>
            <dd className="mt-1 text-sm text-slate-900">{student.expiresAt}</dd>
          </div>
        </dl>
      </Panel>

      <Panel className="border-brand-200 bg-brand-50/40 p-5">
        <div className="flex gap-3">
          <span className="text-lg">🔒</span>
          <div>
            <div className="text-sm font-medium text-slate-900">These values stay with you</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              A proof carries the outcome of a claim — “GPA is at least 3.5” — and never the
              value behind it. Choose what to prove on the next screen.
            </p>
          </div>
        </div>
      </Panel>

      <div className="flex flex-wrap justify-between gap-3">
        <Link href="/student/select-school" className="focusable rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
          ← Back
        </Link>
        <Link href="/student/create-proof">
          <Button>Create a proof</Button>
        </Link>
      </div>
    </div>
  );
}
