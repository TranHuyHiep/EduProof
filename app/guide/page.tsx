import Link from "next/link";
import { IconArrowRight, IconCheck, IconLock, IconSeal } from "@/components/icons";

const WALKTHROUGH = [
  {
    n: "01",
    title: "Connect your wallet",
    body: "Open /student/login. With a Midnight wallet extension (Lace, 1am) installed, EduProof connects it directly. Without one, it falls back to a demo key so the flow still works.",
    href: "/student/login",
    cta: "Connect wallet",
  },
  {
    n: "02",
    title: "Collect a credential",
    body: "Pick a demo student — SV001 (Alice, GPA 3.72, enrolled) or SV002 (Bob, GPA 2.91, enrolled) both make good examples. The signed credential lands in your browser, not on EduProof's server.",
    href: "/student/select-school",
    cta: "Browse demo students",
  },
  {
    n: "03",
    title: "State a claim",
    body: "Build a statement from three parts — attribute, comparison, value. Try “GPA is at least 3.50” and “status is active” together, on both Alice and Bob.",
    href: "/student/create-proof",
    cta: "Build a claim",
  },
  {
    n: "04",
    title: "Generate the proof",
    body: "The circuit evaluates each claim against the credential in your browser. Alice's GPA claim proves true. Bob's proves false — and reveals nothing closer to 2.91 than “below 3.50.”",
    href: "/student/proofs",
    cta: "View your proofs",
  },
  {
    n: "05",
    title: "Share and verify",
    body: "Copy the proof link and open it as a verifier would. The page shows claim outcomes and the issuing institution — never a grade, a name, or a student ID.",
    href: "/verify",
    cta: "Open the verify page",
  },
];

const GLOSSARY = [
  { term: "Credential", def: "A student's academic record, signed by their institution. Never leaves the student's device." },
  { term: "Claim", def: "A statement about the credential that can be checked — e.g. gpa >= 3.5. Not the value itself." },
  { term: "Proof", def: "The outcome of one or more claims, shareable by link. Contains no value the claims didn't ask about." },
  { term: "Issuer", def: "The institution that signed the credential — the party a verifier is trusting." },
  { term: "Verifier", def: "Whoever opens a proof link — no account, no integration, just the claim outcomes." },
];

export default function GuidePage() {
  return (
    <div className="space-y-16">
      <header className="max-w-2xl">
        <p className="eyebrow">Guide</p>
        <h1 className="title mt-3 text-4xl">Try it end to end</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
          Five steps, about two minutes. The case worth paying attention to is
          step 4 with Bob's credential — a claim that fails still discloses
          nothing about how far off it is.
        </p>
      </header>

      <section>
        <h2 className="eyebrow rule pb-2">Walkthrough</h2>
        <div className="rows mt-2">
          {WALKTHROUGH.map((s) => (
            <Link
              key={s.n}
              href={s.href}
              className="focusable group grid gap-x-8 gap-y-2 py-7 sm:grid-cols-[3rem_1fr_auto] sm:items-baseline"
            >
              <span className="mono text-xs text-ink-faint">{s.n}</span>
              <div>
                <h3 className="title text-lg">{s.title}</h3>
                <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-ink-soft">{s.body}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm text-seal-600 transition-colors group-hover:text-seal-700">
                {s.cta}
                <IconArrowRight size={0.95} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-px overflow-hidden border border-rule bg-rule sm:grid-cols-2">
        <div className="bg-surface p-8">
          <p className="eyebrow text-proven">Alice · SV001</p>
          <p className="mt-3 text-sm text-ink-soft">GPA is at least 3.50 and status is active:</p>
          <ul className="mt-5 space-y-2.5">
            <li className="flex items-baseline gap-3 text-[15px] text-ink">
              <IconCheck size={0.95} className="translate-y-0.5 text-proven" />
              Both claims proven
            </li>
            <li className="flex items-baseline gap-3 text-[15px] text-ink-faint">
              <IconLock size={0.95} className="translate-y-0.5" />
              3.72 never appears anywhere
            </li>
          </ul>
        </div>
        <div className="bg-surface p-8">
          <p className="eyebrow text-failed">Bob · SV002</p>
          <p className="mt-3 text-sm text-ink-soft">Same claim, a GPA of 2.91:</p>
          <ul className="mt-5 space-y-2.5">
            <li className="flex items-baseline gap-3 text-[15px] text-ink">
              <IconCheck size={0.95} className="translate-y-0.5 text-failed rotate-45" />
              GPA claim not proven
            </li>
            <li className="flex items-baseline gap-3 text-[15px] text-ink-faint">
              <IconLock size={0.95} className="translate-y-0.5" />
              2.91 still never appears — a failing proof narrows nothing
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="eyebrow rule pb-2">Terms</h2>
        <dl className="rows mt-2">
          {GLOSSARY.map((g) => (
            <div key={g.term} className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
              <dt className="flex items-center gap-2 text-[15px] text-ink">
                <IconSeal size={0.9} className="text-ink-faint" />
                {g.term}
              </dt>
              <dd className="text-[14px] leading-relaxed text-ink-soft">{g.def}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
