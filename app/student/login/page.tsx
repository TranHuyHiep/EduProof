"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, SchoolBoundaryNote, Skeleton, Steps } from "@/components/ui";
import { IconAlert, IconArrowRight, IconWallet } from "@/components/icons";
import { fetchCredential, fetchDemoRoster, type StudentSummary } from "@/lib/school-api";
import { setCredential, setSessionSchoolId, setWalletAddress } from "@/lib/session";
import { connectWallet } from "@/lib/wallet";
import { shortenMiddle } from "@/lib/format";

type Stage = "connect" | "choose";

export default function ConnectPage() {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("connect");
  const [wallet, setWallet] = useState<{ address: string; isDemo: boolean } | null>(null);
  const [students, setStudents] = useState<StudentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The roster comes from the school's own system, in the browser — the
  // EduProof server never sees it.
  useEffect(() => {
    if (stage !== "choose") return;
    fetchDemoRoster()
      .then(setStudents)
      .catch((e: Error) => { setError(e.message); setStudents([]); });
  }, [stage]);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const connection = await connectWallet();
      setWallet(connection);
      setWalletAddress(connection.address);
      setStage("choose");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function claimIdentity(student: StudentSummary) {
    setBusy(true);
    setError(null);
    try {
      const credential = await fetchCredential(student.id);
      setCredential(credential);
      setSessionSchoolId(student.schoolId);
      router.push("/student/credentials");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <Steps current={0} labels={["Connect", "Credential", "Statements", "Proof"]} />

      {stage === "connect" ? (
        <>
          <header>
            <h1 className="title text-4xl">Connect your wallet</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              Your wallet is the identity EduProof knows you by. It never learns your
              name, and the credential it unlocks stays on this device.
            </p>
          </header>

          <div className="sheet p-8">
            <Button onClick={connect} disabled={busy} className="inline-flex items-center gap-2">
              <IconWallet size={1.05} />
              {busy ? "Connecting…" : "Connect wallet"}
            </Button>
            <p className="mt-4 text-xs leading-relaxed text-ink-faint">
              Looks for a browser wallet and falls back to a demo key, so the flow
              works without an extension installed. Proving that you own the wallet
              is wave two&rsquo;s job.
            </p>
          </div>
        </>
      ) : (
        <>
          <header>
            <h1 className="title text-4xl">Collect your credential</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              Connected as{" "}
              <span className="mono text-[13px] text-ink">
                {wallet ? shortenMiddle(wallet.address) : "…"}
              </span>
              {wallet?.isDemo && (
                <span className="ml-2 text-[11px] uppercase tracking-wider text-caution">
                  demo key
                </span>
              )}
            </p>
          </header>

          <div className="sheet">
            <div className="rule px-6 py-4">
              <p className="eyebrow">Choose a record to collect</p>
              <p className="mt-2 text-xs leading-relaxed text-ink-faint">
                A real institution authenticates the student instead of offering a
                roster. This picker exists so the demo can be walked through.
              </p>
            </div>

            {students === null ? (
              <div className="rows">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : error ? (
              <EmptyState
                icon={<IconAlert />}
                title="The institution's system did not answer"
                body={error}
              />
            ) : (
              <div className="rows">
                {students.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => claimIdentity(s)}
                    disabled={busy}
                    className="focusable group flex w-full items-center justify-between px-6 py-3.5 text-left transition-colors hover:bg-paper-deep/60 disabled:opacity-50"
                  >
                    <span className="text-[15px] text-ink">{s.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="mono text-xs text-ink-faint">{s.id}</span>
                      <IconArrowRight
                        size={0.95}
                        className="text-rule transition-colors group-hover:text-seal-600"
                      />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <SchoolBoundaryNote />
        </>
      )}

      {error && stage === "connect" && (
        <p role="alert" className="text-sm text-failed">{error}</p>
      )}
    </div>
  );
}
