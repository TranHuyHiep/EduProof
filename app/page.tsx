import Link from "next/link";
import { Panel, Badge } from "@/components/ui";
import { getSchools } from "@/lib/data";

export default function HomePage() {
  const schools = getSchools();

  return (
    <div className="space-y-12">
      <section className="pt-4 text-center">
        <Badge tone="brand">Privacy-preserving verification</Badge>
        <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold leading-[1.15] tracking-tight text-slate-900">
          Verify academic facts,
          <br />
          not academic records.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600">
          A scholarship board needs to know a GPA clears 3.5 — not what it is.
          EduProof proves the claim and withholds everything else.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/student/login"
            className="focusable rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Student sign in
          </Link>
          <Link
            href="/school"
            className="focusable rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            School directory
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Panel className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-rose-600">
            Sharing a transcript
          </div>
          <p className="mt-2 text-sm text-slate-600">One question asked. Everything handed over:</p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
            {["Full name and student ID", "Exact GPA", "Every course and grade", "Enrolment history"].map((x) => (
              <li key={x} className="flex gap-2">
                <span className="text-rose-400">•</span>
                {x}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="border-emerald-200 p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            With EduProof
          </div>
          <p className="mt-2 text-sm text-slate-600">The same question. The answer only:</p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
            <li className="flex gap-2"><span className="text-emerald-600">✓</span>GPA is at least 3.5</li>
            <li className="flex gap-2"><span className="text-emerald-600">✓</span>Currently an active student</li>
            <li className="flex gap-2 text-slate-400"><span>🔒</span>Exact GPA withheld</li>
            <li className="flex gap-2 text-slate-400"><span>🔒</span>Identity withheld</li>
          </ul>
        </Panel>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">How it works</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            { role: "School", body: "Holds the academic record and acts as the credential issuer.", href: "/school", cta: "Browse directory" },
            { role: "Student", body: "Chooses which claims to prove, then generates a shareable proof.", href: "/student/login", cta: "Sign in" },
            { role: "Verifier", body: "Opens the link and sees the claim outcomes — nothing more.", href: "/verify/demo", cta: "See a proof" },
          ].map((r) => (
            <Link key={r.role} href={r.href} className="focusable panel group p-5 transition hover:border-brand-200">
              <div className="text-sm font-semibold text-slate-900">{r.role}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{r.body}</p>
              <span className="mt-4 inline-block text-sm font-medium text-brand-600">{r.cta} →</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Issuing institution</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {schools.map((s) => (
            <Panel key={s.id} className="flex items-center justify-between p-5">
              <div>
                <div className="text-sm font-medium text-slate-900">{s.name}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {s.country} · records held by the school
                </div>
              </div>
              {s.verified && <Badge tone="success">✓ Verified issuer</Badge>}
            </Panel>
          ))}
        </div>
      </section>
    </div>
  );
}
