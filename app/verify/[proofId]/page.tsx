"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ClaimLine, EmptyState, Entry, Skeleton, Tag } from "@/components/ui";
import { Seal } from "@/components/seal";
import { IconAlert, IconArrowRight, IconLock } from "@/components/icons";
import { ATTRIBUTES, proofProvider } from "@/lib/proof";
import { formatDate, formatDateTime } from "@/lib/format";
import type { VerificationResult } from "@/types";

/** Attributes a proof deliberately does not carry, whichever claims it makes. */
const ALWAYS_WITHHELD = ["Full name", "Student ID", "Complete transcript"];

/**
 * The public verifier view. No account, no login.
 *
 * It renders only validity, issuer and claim outcomes — it cannot leak an
 * attribute value, because `Proof` has no field that could hold one.
 */
export default function VerifyProofPage({
  params,
}: { params: Promise<{ proofId: string }> }) {
  const { proofId } = use(params);
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    let alive = true;
    proofProvider.verifyProof(proofId).then((r) => { if (alive) setResult(r); });
    return () => { alive = false; };
  }, [proofId]);

  if (!result) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="mx-auto h-32 w-32 rounded-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const { valid, proof, reason } = result;

  if (!proof) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="sheet">
          <EmptyState
            icon={<IconAlert />}
            title="No proof found"
            body={reason ?? "Nothing on this device matches that identifier."}
            action={
              <Link
                href="/verify"
                className="focusable inline-flex items-center gap-2 bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-seal-700"
              >
                Check another proof
                <IconArrowRight size={1} />
              </Link>
            }
          />
        </div>
        <p className="mt-4 text-center text-xs leading-relaxed text-ink-faint">
          Proofs are stored on the device that created them in this prototype.
          Wave two records them on chain, so any link opens anywhere.
        </p>
      </div>
    );
  }

  const withheldFromClaims = ATTRIBUTES.filter((a) =>
    proof.withheldAttributes.includes(a.id),
  ).map((a) => a.withheldLabel);

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      {/* The seal, and the verdict beside it. */}
      <header className="rise flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left">
        <Seal proofId={proof.proofId} valid={valid} />
        <div>
          <p className="eyebrow">Certificate of attestation</p>
          <h1 className={`title mt-2 text-4xl ${valid ? "text-ink" : "text-failed"}`}>
            {valid ? "Proof verified" : "Not verified"}
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
            {valid
              ? `Attested by ${proof.issuer.schoolName} on ${formatDate(proof.createdAt)}.`
              : (reason ?? "This proof could not be verified.")}
          </p>
        </div>
      </header>

      {/* What was proven. */}
      <section>
        <div className="rule flex items-baseline justify-between pb-2">
          <h2 className="eyebrow">Statements proven</h2>
          <span className="text-[11px] tabular-nums text-ink-faint">
            {proof.claims.filter((c) => c.satisfied).length} of {proof.claims.length}
          </span>
        </div>
        <div className="rows">
          {proof.claims.map((c) => (
            <ClaimLine key={c.statement} label={c.label} satisfied={c.satisfied} />
          ))}
        </div>
      </section>

      {/* What was not disclosed — the point of the product. */}
      <section>
        <h2 className="eyebrow rule pb-2">Withheld from this page</h2>
        <p className="pt-4 text-sm leading-relaxed text-ink-soft">
          The statements above were proven without disclosing:
        </p>
        <ul className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {[...withheldFromClaims, ...ALWAYS_WITHHELD].map((item) => (
            <li key={item} className="flex items-baseline gap-2.5 text-[15px] text-ink-faint">
              <IconLock size={0.9} className="translate-y-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Issuer. */}
      <section>
        <h2 className="eyebrow rule pb-2">Issuing institution</h2>
        <div className="flex items-baseline justify-between gap-4 pt-4">
          <div>
            <div className="text-[15px] text-ink">{proof.issuer.schoolName}</div>
            <div className="mono mt-1 text-xs text-ink-faint">{proof.issuer.keyId}</div>
          </div>
          {proof.issuer.verified && <Tag tone="proven">Verified issuer</Tag>}
        </div>
      </section>

      {/* The register entry. */}
      <section>
        <h2 className="eyebrow rule pb-2">Register</h2>
        <dl className="rows pt-1">
          <Entry label="Proof reference" value={proof.proofId} mono />
          <Entry label="Subject handle" value={proof.subject} mono />
          <Entry label="Issued" value={formatDateTime(proof.createdAt)} />
          <Entry label="Credential valid until" value={formatDate(proof.expiresAt)} />
          <Entry label="Proving system" value={proof.provider} />
        </dl>
      </section>

      <footer className="rule-soft flex flex-wrap items-center justify-between gap-4 border-t pt-6">
        <p className="max-w-sm text-xs leading-relaxed text-ink-faint">
          The subject handle is opaque and cannot be traced back to a student.
        </p>
        <Link
          href="/verify"
          className="focusable inline-flex items-center gap-2 border border-rule px-4 py-2.5 text-sm text-ink transition-colors hover:border-ink-faint"
        >
          Check another proof
          <IconArrowRight size={0.95} />
        </Link>
      </footer>
    </div>
  );
}
