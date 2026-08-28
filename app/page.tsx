import Link from "next/link";
import { IconArrowRight, IconCheck, IconLock } from "@/components/icons";
import { getSchools } from "@/lib/data";

const GIVEN_AWAY = [
  "Full name and student ID",
  "Exact grade point average",
  "Every course and every mark",
  "Enrolment history",
];

const ROLES = [
  {
    n: "01",
    role: "The institution",
    body: "Holds the record and signs it. Nothing leaves for EduProof — the student collects a credential directly from the school's own system.",
    href: "/school",
    cta: "Open the registry",
  },
  {
    n: "02",
    role: "The student",
    body: "Builds a statement from three parts — subject, comparison, value — and generates a proof of it. The record itself never leaves the device.",
    href: "/student/login",
    cta: "Connect a wallet",
  },
  {
    n: "03",
    role: "The verifier",
    body: "Opens a link and reads the outcome. There is no account to create, and no record to store afterwards.",
    href: "/verify",
    cta: "Verify a proof",
  },
];

export default function HomePage() {
  const schools = getSchools();

  return (
    <div className="space-y-20">
      {/* Hero — left-aligned, with room to breathe. */}
      <section className="max-w-3xl">
        <p className="eyebrow">Privacy-preserving attestation</p>
        <h1 className="title mt-5 text-[2.75rem] sm:text-[3.5rem]">
          Verify academic facts,
          <br />
          not academic records.
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-soft">
          A scholarship board needs to know a grade average clears 3.5 — not what it is.
          EduProof proves the statement and withholds everything behind it.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-6">
          <Link
            href="/student/login"
            className="focusable inline-flex items-center gap-2 bg-ink px-5 py-3 text-sm font-medium text-paper transition-colors hover:bg-seal-700"
          >
            Connect wallet
            <IconArrowRight size={1} />
          </Link>
          <Link
            href="/verify"
            className="focusable text-sm font-medium text-ink-soft underline decoration-rule underline-offset-4 transition-colors hover:text-seal-600"
          >
            I have a proof to check
          </Link>
        </div>
      </section>

      {/* The comparison — two columns divided by a rule, not two floating cards. */}
      <section className="grid gap-px overflow-hidden border border-rule bg-rule sm:grid-cols-2">
        <div className="bg-surface p-8">
          <p className="eyebrow text-failed">Sending a transcript</p>
          <p className="mt-3 text-sm text-ink-soft">One question asked. All of this handed over:</p>
          <ul className="mt-5 space-y-2.5">
            {GIVEN_AWAY.map((item) => (
              <li key={item} className="flex items-baseline gap-3 text-[15px] text-ink">
                <span className="text-failed">—</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-surface p-8">
          <p className="eyebrow text-proven">With EduProof</p>
          <p className="mt-3 text-sm text-ink-soft">The same question. The answer only:</p>
          <ul className="mt-5 space-y-2.5">
            <li className="flex items-baseline gap-3 text-[15px] text-ink">
              <IconCheck size={0.95} className="translate-y-0.5 text-proven" />
              Grade average is at least 3.5
            </li>
            <li className="flex items-baseline gap-3 text-[15px] text-ink">
              <IconCheck size={0.95} className="translate-y-0.5 text-proven" />
              Currently enrolled
            </li>
            <li className="flex items-baseline gap-3 text-[15px] text-ink-faint">
              <IconLock size={0.95} className="translate-y-0.5" />
              The average itself, withheld
            </li>
            <li className="flex items-baseline gap-3 text-[15px] text-ink-faint">
              <IconLock size={0.95} className="translate-y-0.5" />
              Identity, withheld
            </li>
          </ul>
        </div>
      </section>

      {/* Three roles, numbered like clauses. */}
      <section>
        <h2 className="eyebrow rule pb-2">How it works</h2>
        <div className="rows mt-2">
          {ROLES.map((r) => (
            <Link
              key={r.n}
              href={r.href}
              className="focusable group grid gap-x-8 gap-y-2 py-7 sm:grid-cols-[3rem_1fr_auto] sm:items-baseline"
            >
              <span className="mono text-xs text-ink-faint">{r.n}</span>
              <div>
                <h3 className="title text-lg">{r.role}</h3>
                <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-ink-soft">{r.body}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm text-seal-600 transition-colors group-hover:text-seal-700">
                {r.cta}
                <IconArrowRight size={0.95} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Issuing institutions. */}
      <section>
        <h2 className="eyebrow rule pb-2">Issuing institutions</h2>
        <div className="rows mt-2">
          {schools.map((s) => (
            <div key={s.id} className="flex items-baseline justify-between gap-4 py-5">
              <div>
                <div className="text-[15px] text-ink">{s.name}</div>
                <div className="mt-0.5 text-xs text-ink-faint">
                  {s.country} · key <span className="mono">{s.issuerKeyId}</span>
                </div>
              </div>
              {s.verified && (
                <span className="text-[11px] uppercase tracking-wider text-proven">Verified</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
