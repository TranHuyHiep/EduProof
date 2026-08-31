"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, SchoolBoundaryNote, Skeleton, Steps } from "@/components/ui";
import { IconAlert, IconArrowRight, IconWallet } from "@/components/icons";
import { getSchools } from "@/lib/data";
import { fetchCredential, fetchDemoRoster, type StudentSummary } from "@/lib/school-api";
import { setCredential, setSessionSchoolId, setWalletAddress } from "@/lib/session";
import { connectInjectedWallet, connectWallet, installedWallets, type WalletConnection } from "@/lib/wallet";
import { shortenMiddle } from "@/lib/format";

type Stage = "connect" | "school" | "choose";

export default function ConnectPage() {
  const router = useRouter();
  const schools = getSchools();

  const [stage, setStage] = useState<Stage>("connect");
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [pickWallet, setPickWallet] = useState<Array<{ key: string; name: string }> | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The roster comes from the school's own system, in the browser — the
  // EduProof server never sees it.
  useEffect(() => {
    if (stage !== "choose" || !schoolId) return;
    fetchDemoRoster(schoolId)
      .then(setStudents)
      .catch((e: Error) => { setError(e.message); setStudents([]); });
  }, [stage, schoolId]);

  function afterConnect(connection: WalletConnection) {
    setWallet(connection);
    setWalletAddress(connection.address);
    setStage(schools.length > 1 ? "school" : "choose");
    if (schools.length === 1) setSchoolId(schools[0].id);
  }

  function pickSchool(id: string) {
    setSchoolId(id);
    setStage("choose");
  }

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const wallets = installedWallets();
      if (wallets.length > 1) {
        // More than one Midnight wallet extension is installed — ask which
        // one to use rather than guessing on the user's behalf.
        setPickWallet(wallets.map((w) => ({ key: w.key, name: w.api.name })));
        return;
      }
      afterConnect(await connectWallet());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function connectPicked(key: string) {
    setPickWallet(null);
    setBusy(true);
    setError(null);
    try {
      afterConnect(await connectInjectedWallet(key));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function claimIdentity(student: StudentSummary) {
    if (!schoolId) return;
    setBusy(true);
    setError(null);
    try {
      const credential = await fetchCredential(schoolId, student.id);
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
            {pickWallet ? (
              <div className="space-y-3">
                <p className="eyebrow">More than one wallet found</p>
                <div className="rows">
                  {pickWallet.map((w) => (
                    <button
                      key={w.key}
                      onClick={() => connectPicked(w.key)}
                      disabled={busy}
                      className="focusable group flex w-full items-center justify-between py-3 text-left transition-colors hover:bg-paper-deep/60 disabled:opacity-50"
                    >
                      <span className="flex items-center gap-2 text-[15px] text-ink">
                        <IconWallet size={1} />
                        {w.name}
                      </span>
                      <IconArrowRight
                        size={0.95}
                        className="text-rule transition-colors group-hover:text-seal-600"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <Button onClick={connect} disabled={busy} className="inline-flex items-center gap-2">
                  <IconWallet size={1.05} />
                  {busy ? "Connecting…" : "Connect wallet"}
                </Button>
                <p className="mt-4 text-xs leading-relaxed text-ink-faint">
                  Looks for a Midnight wallet extension — Lace or 1am — and falls back
                  to a demo key so the flow works without one installed. Proving that
                  you own the wallet is wave two&rsquo;s job.
                </p>
              </>
            )}
          </div>
        </>
      ) : stage === "school" ? (
        <>
          <header>
            <h1 className="title text-4xl">Select your institution</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              Which school holds your record? Each institution runs its own
              system — EduProof asks the one you pick, and no other.
            </p>
          </header>

          <div className="sheet">
            <div className="rows">
              {schools.map((s) => (
                <button
                  key={s.id}
                  onClick={() => pickSchool(s.id)}
                  className="focusable group flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-paper-deep/60"
                >
                  <div>
                    <div className="text-[15px] text-ink">{s.name}</div>
                    <div className="mt-0.5 text-xs text-ink-faint">{s.country}</div>
                  </div>
                  <IconArrowRight
                    size={0.95}
                    className="text-rule transition-colors group-hover:text-seal-600"
                  />
                </button>
              ))}
            </div>
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
              {wallet?.isDemo ? (
                <span className="ml-2 text-[11px] uppercase tracking-wider text-caution">
                  demo key
                </span>
              ) : wallet?.walletName ? (
                <span className="ml-2 text-[11px] uppercase tracking-wider text-proven">
                  via {wallet.walletName}
                </span>
              ) : null}
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
