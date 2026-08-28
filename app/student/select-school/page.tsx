"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel, Badge, Button, Steps, Skeleton } from "@/components/ui";
import { getSchools } from "@/lib/data";
import { setSessionSchoolId } from "@/lib/session";
import { useStudent } from "@/lib/use-student";

export default function SelectSchoolPage() {
  const router = useRouter();
  const { student, loading } = useStudent();
  const schools = getSchools();
  const [selected, setSelected] = useState<string | null>(null);

  if (loading || !student) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 pt-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // A student's records live at their issuing institution.
  const available = schools.filter((s) => s.id === student.schoolId);

  function proceed() {
    if (!selected) return;
    setSessionSchoolId(selected);
    router.push("/student/credentials");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Steps current={1} labels={["Sign in", "Institution", "Credentials", "Claims", "Proof"]} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Select your institution</h1>
        <p className="mt-1 text-sm text-slate-600">
          Signed in as <span className="font-medium text-slate-900">{student.name}</span>. Choose the
          institution holding your record.
        </p>
      </div>

      <div className="space-y-3">
        {available.map((s) => {
          const on = selected === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              aria-pressed={on}
              className={`focusable panel flex w-full items-center justify-between p-5 text-left transition ${
                on ? "border-brand-500 ring-1 ring-brand-500" : "hover:border-brand-200"
              }`}
            >
              <div>
                <div className="text-sm font-medium text-slate-900">{s.name}</div>
                <div className="mt-0.5 text-xs text-slate-500">{s.country}</div>
              </div>
              <div className="flex items-center gap-2">
                {s.verified && <Badge tone="success">✓ Verified</Badge>}
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ring-1 ${
                    on ? "bg-brand-600 text-white ring-brand-600" : "ring-slate-300"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={proceed} disabled={!selected}>Continue</Button>
      </div>

      <p className="text-xs text-slate-500">
        This prototype ships one institution. The data model already supports
        several, so more can be added without code changes.
      </p>
    </div>
  );
}
