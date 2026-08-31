import Link from "next/link";
import { IconArrowRight, IconCheck, IconLock } from "@/components/icons";
import { getSchools } from "@/lib/data";
import { explorerContractUrl, NETWORK } from "@/lib/midnight/config";

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

const LEDGER = [
  { data: "Issuer registry — school → public key", where: "Public ledger", who: "Everyone" },
  { data: "Count of predicates verified", where: "Public ledger", who: "Everyone" },
  { data: "Signed credential — GPA, name, ID", where: "Private state, in the browser", who: "The student" },
  { data: "Student's proving secret", where: "Private state, in the browser", who: "The student" },
  { data: "Predicate outcome — true / false", where: "Circuit output", who: "The verifier" },
];

const ROADMAP = [
  {
    wave: "Wave 1",
    status: "Shipped",
    items: [
      "Dynamic predicate circuit, one for every claim",
      "Deployed to Midnight Preprod",
      "Hand-rolled Schnorr signature for ledger 8",
    ],
  },
  {
    wave: "Wave 2",
    status: "Planned",
    items: [
      "Wallet ownership proven by signature, not just connected",
      "Proof links portable across devices",
      "Proof Request — a verifier asks, the student approves",
    ],
  },
  {
    wave: "Wave 3",
    status: "Planned",
    items: [
      "Integration gateway for other institutions",
      "Credential revocation",
      "Selective disclosure across multiple issuers",
    ],
  },
];

export default function HomePage() {
  const schools = getSchools();
  const contractUrl = explorerContractUrl();

  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="eyebrow">Privacy-preserving attestation</p>
        <h1 className="title mt-5 text-[2.75rem] sm:text-[3.5rem]">
          Verify academic facts,
          <br />
          not academic records.
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-soft">
          A scholarship board needs to know a grade average clears 3.5 — not what it is.
          EduProof proves the statement and withholds everything behind it, using a
          zero-knowledge circuit on Midnight.
        </p>

        <dl className="mt-9 flex flex-wrap gap-x-10 gap-y-3 text-xs">
          <div>
            <dt className="text-ink-faint">Circuit</dt>
            <dd className="mt-0.5 text-ink">One, taking the predicate as an argument</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Contract</dt>
            <dd className="mt-0.5 text-ink">
              {contractUrl ? (
                <a
                  href={contractUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-rule underline-offset-2 hover:text-seal-600"
                >
                  Live on {NETWORK}
                </a>
              ) : (
                "Not yet deployed"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Tests</dt>
            <dd className="mt-0.5 text-ink">258 passing, circuit mutation-tested</dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-wrap items-center gap-6">
          <Link
            href="/guide"
            className="focusable inline-flex items-center gap-2 bg-ink px-5 py-3 text-sm font-medium text-paper transition-colors hover:bg-seal-700"
          >
            Try it in two minutes
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

      {/* The comparison */}
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

      {/* Three roles */}
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

      {/* Dual-ledger model */}
      <section>
        <h2 className="eyebrow rule pb-2">Midnight&rsquo;s dual-ledger model</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
          The public ledger holds exactly two things: issuer keys and a counter.
          There is structurally nowhere on it for a student&rsquo;s value to land.
        </p>
        <div className="mt-5 overflow-x-auto border border-rule bg-surface">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="rule text-left">
                <th className="eyebrow px-5 py-3 font-semibold">Data</th>
                <th className="eyebrow px-5 py-3 font-semibold">Lives in</th>
                <th className="eyebrow px-5 py-3 font-semibold">Visible to</th>
              </tr>
            </thead>
            <tbody className="rows">
              {LEDGER.map((row) => (
                <tr key={row.data}>
                  <td className="px-5 py-3.5 text-ink">{row.data}</td>
                  <td className="px-5 py-3.5 text-ink-soft">{row.where}</td>
                  <td className="px-5 py-3.5 text-ink-soft">{row.who}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Roadmap */}
      <section>
        <h2 className="eyebrow rule pb-2">Roadmap</h2>
        <div className="mt-5 grid gap-px overflow-hidden border border-rule bg-rule sm:grid-cols-3">
          {ROADMAP.map((w) => (
            <div key={w.wave} className="bg-surface p-6">
              <p className={`eyebrow ${w.status === "Shipped" ? "text-proven" : "text-ink-faint"}`}>
                {w.wave} · {w.status}
              </p>
              <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-ink-soft">
                {w.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className={w.status === "Shipped" ? "text-proven" : "text-ink-faint"}>
                      {w.status === "Shipped" ? "✓" : "·"}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Issuing institutions */}
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
