import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { NETWORK, explorerContractUrl, midnightConfig, providerName } from "@/lib/midnight/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduProof — Verify academic facts, not academic records",
  description:
    "Privacy-preserving student credential verification. Prove a claim without disclosing the record behind it.",
};

const NAV = [
  { href: "/school", label: "Registry" },
  { href: "/student/login", label: "Student" },
  { href: "/verify", label: "Verify" },
  { href: "/guide", label: "Guide" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/*
        suppressHydrationWarning: browser extensions (Grammarly, password
        managers, ad blockers) inject attributes into `body` before React
        hydrates — e.g. Grammarly's `data-gr-ext-installed`. That mismatch is
        real but harmless: React only skips warning about it here, and still
        hydrates and patches every other mismatch normally.
      */}
      <body className="flex min-h-screen flex-col" suppressHydrationWarning>
        {/*
          Says which proving system is actually running. Hardcoding it was
          wrong in both directions once the circuit existed: it understated the
          Midnight build and would have overstated the mock.
        */}
        <div className="no-print border-b border-rule-soft bg-paper-deep px-5 py-1.5 text-center text-[11px] tracking-wide text-ink-faint">
          {providerName() !== "midnight" ? (
            "Demo mode · statements are evaluated in the open · run with NEXT_PUBLIC_PROOF_PROVIDER=midnight for the real circuit"
          ) : midnightConfig.contractAddress ? (
            <>
              Statements are proven by a Compact circuit ·{" "}
              <a
                className="underline underline-offset-2 hover:text-ink"
                href={explorerContractUrl() ?? undefined}
                target="_blank"
                rel="noreferrer"
              >
                the contract is deployed to {NETWORK}
              </a>
            </>
          ) : (
            "Statements are proven by a Compact circuit · the contract is not yet deployed to a network"
          )}
        </div>

        <header className="no-print border-b border-rule bg-paper/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
            <Link href="/" className="focusable flex items-center gap-2.5">
              <Image src="/logo/logo-c-monogram.svg" alt="" width={36} height={36} />
              <span className="flex items-baseline gap-2.5">
                <span className="title text-lg">EduProof</span>
                <span className="hidden text-[11px] uppercase tracking-[0.14em] text-ink-faint sm:inline">
                  Academic attestation
                </span>
              </span>
            </Link>

            <nav className="flex items-center gap-6 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="focusable text-ink-soft transition-colors hover:text-seal-600"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">{children}</main>

        <footer className="no-print border-t border-rule-soft">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-xs text-ink-faint">
            <span>EduProof · built for the Midnight Buildathon</span>
            <span>Records stay with the institution that issued them.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
