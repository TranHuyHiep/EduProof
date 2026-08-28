import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduProof — Verify academic facts, not academic records",
  description:
    "Privacy-preserving student credential verification. Prove a claim without disclosing the record behind it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="no-print border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-[11px] text-amber-800">
          UI prototype · mock proof provider · no cryptography yet
        </div>

        <header className="no-print sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
            <Link href="/" className="focusable flex items-center gap-2 rounded-lg">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-sm text-white">E</span>
              <span className="text-[15px] font-semibold tracking-tight">EduProof</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/school" className="focusable rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
                School
              </Link>
              <Link href="/student/login" className="focusable rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
                Student
              </Link>
              <Link href="/verify/demo" className="focusable rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
                Verify
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>

        <footer className="no-print mx-auto max-w-6xl px-5 pb-10 pt-6 text-xs text-slate-400">
          EduProof · MVP prototype
        </footer>
      </body>
    </html>
  );
}
