"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Panel, Button } from "@/components/ui";
import { fetchCredential, fetchStudents, type StudentSummary } from "@/lib/school-api";
import { setCredential, setSessionSchoolId, setWalletAddress } from "@/lib/session";
import { connectWallet, shortAddress } from "@/lib/wallet";

type Stage = "connect" | "choose";

export default function StudentLoginPage() {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("connect");
  const [wallet, setWallet] = useState<{ address: string; isDemo: boolean } | null>(null);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The roster comes from the school's own API, in the browser — the EduProof
  // server never sees it.
  useEffect(() => {
    if (stage !== "choose") return;
    fetchStudents()
      .then(setStudents)
      .catch((e: Error) =>
        setError(`Could not reach the school directory. Is mock-school-api running? (${e.message})`),
      );
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
      setSessionSchoolId(credential.issuer.schoolId);
      router.push("/student/credentials");
    } catch (e) {
      setError(`Could not fetch your credential: ${(e as Error).message}`);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md pt-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Student sign in</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          {stage === "connect"
            ? "Connect a wallet to begin."
            : "Select your record to receive a signed credential."}
        </p>
      </div>

      <Panel className="mt-6 p-6">
        {stage === "connect" ? (
          <>
            <Button onClick={connect} disabled={busy} className="w-full">
              {busy ? "Connecting…" : "Connect wallet"}
            </Button>
            <p className="mt-3 text-center text-xs text-slate-500">
              No wallet extension? A demo key is generated for you.
            </p>
          </>
        ) : (
          <>
            {wallet && (
              <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="mono text-xs text-slate-600">{shortAddress(wallet.address)}</span>
                {wallet.isDemo && (
                  <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                    demo key
                  </span>
                )}
              </div>
            )}

            {students.length === 0 && !error ? (
              <p className="py-4 text-center text-sm text-slate-500">Loading directory…</p>
            ) : (
              <div className="space-y-1.5">
                {students.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => claimIdentity(s)}
                    disabled={busy}
                    className="focusable flex w-full items-center justify-between rounded-xl border border-line px-3.5 py-2.5 text-left transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <span className="text-sm text-slate-800">{s.name}</span>
                    <span className="mono text-xs text-slate-500">{s.id}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {error && (
          <p role="alert" className="mt-4 text-xs text-rose-600">
            {error}
          </p>
        )}
      </Panel>

      <p className="mt-4 text-center text-xs text-slate-500">
        Your record is fetched from the school and stays on this device.
      </p>
    </div>
  );
}
