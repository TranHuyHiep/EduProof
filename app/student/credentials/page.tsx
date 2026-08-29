"use client";
import Link from "next/link";
import { useState } from "react";
import { Entry, Skeleton, StatusTag, Steps } from "@/components/ui";
import { IconArrowRight, IconLock } from "@/components/icons";
import { getSchool } from "@/lib/data";
import { useStudent } from "@/lib/use-student";
import { formatDate, shortenMiddle } from "@/lib/format";
import { formatGpa } from "@/types";

/**
 * The credential as held on this device.
 *
 * Values are shown here because this is the student looking at their own
 * record — and blurred by default as a reminder of what a proof withholds.
 */
export default function CredentialsPage() {
  const { student, loading } = useStudent();
  const [reveal, setReveal] = useState(false);

  if (loading || !student) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const school = getSchool(student.schoolId);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Steps current={1} labels={["Connect", "Credential", "Statements", "Proof"]} />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{school?.name ?? "Institution"}</p>
          <h1 className="title mt-3 text-4xl">Your credential</h1>
        </div>
        <button
          onClick={() => setReveal((v) => !v)}
          className="focusable inline-flex items-center gap-1.5 text-sm text-ink-soft underline decoration-rule underline-offset-4 transition-colors hover:text-seal-600"
        >
          <IconLock size={0.95} />
          {reveal ? "Hide values" : "Reveal values"}
        </button>
      </header>

      <p className="max-w-xl text-[15px] leading-relaxed text-ink-soft">
        Signed by the institution and stored only on this device. EduProof never
        receives it — a proof carries the outcome of a statement, never the values below.
      </p>

      <div className="sheet">
        <div className="rule flex items-center justify-between px-6 py-4">
          <span className="mono text-xs text-ink-faint">
            {shortenMiddle(student.name, 14, 6)}
          </span>
          <StatusTag status={student.status} />
        </div>

        <dl className="rows px-6">
          <Entry label="Enrolment status" value={student.status} redacted={!reveal} />
          <Entry label="Grade average" value={formatGpa(student.gpaScaled)} redacted={!reveal} />
          <Entry label="Academic year" value={student.academicYear} redacted={!reveal} />
          <Entry label="Degree" value={student.degree} redacted={!reveal} />
          <Entry label="Field of study" value={student.major} redacted={!reveal} />
          <Entry label="Issued" value={formatDate(student.enrolledAt)} />
          <Entry label="Valid until" value={formatDate(student.expiresAt)} />
        </dl>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/student/proofs"
          className="focusable text-sm text-ink-soft underline decoration-rule underline-offset-4 transition-colors hover:text-seal-600"
        >
          Proofs you have issued
        </Link>
        <Link
          href="/student/create-proof"
          className="focusable inline-flex items-center gap-2 bg-ink px-5 py-3 text-sm font-medium text-paper transition-colors hover:bg-seal-700"
        >
          Build a statement
          <IconArrowRight size={1} />
        </Link>
      </div>
    </div>
  );
}
