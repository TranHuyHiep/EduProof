"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel, Button } from "@/components/ui";
import { getStudent } from "@/lib/data";
import { setSessionStudentId } from "@/lib/session";

const DEMO_IDS = ["SV001", "SV002", "SV003"];

export default function StudentLoginPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function submit() {
    const id = studentId.trim();
    if (!id) return setError("Enter your student ID.");

    setBusy(true);
    setError(null);

    setTimeout(() => {
      const student = getStudent(id);
      if (!student) {
        setError(`No record found for “${id}”.`);
        setBusy(false);
        return;
      }
      setSessionStudentId(student.id);
      router.push("/student/select-school");
    }, 500);
  }

  return (
    <div className="mx-auto max-w-md pt-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Student sign in</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Enter your student ID to access your credentials.
        </p>
      </div>

      <Panel className="mt-6 p-6">
        <form
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="sid" className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Student ID
            </label>
            <input
              id="sid"
              value={studentId}
              onChange={(e) => { setStudentId(e.target.value); setError(null); }}
              placeholder="SV001"
              autoComplete="off"
              aria-invalid={!!error}
              aria-describedby={error ? "sid-error" : undefined}
              className={`focusable mono mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm uppercase placeholder:normal-case placeholder:text-slate-400 ${
                error ? "border-rose-300" : "border-line"
              }`}
            />
            {error && (
              <p id="sid-error" role="alert" className="mt-2 text-xs text-rose-600">{error}</p>
            )}
          </div>

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Checking…" : "Continue"}
          </Button>
        </form>

        <div className="mt-5 border-t border-line pt-4">
          <div className="text-xs font-medium text-slate-500">Demo accounts</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {DEMO_IDS.map((id) => (
              <button
                key={id}
                onClick={() => { setStudentId(id); setError(null); }}
                className="focusable mono rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700 transition hover:bg-slate-200"
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <p className="mt-4 text-center text-xs text-slate-500">
        Demo sign-in only — no password, no real authentication.
      </p>
    </div>
  );
}
