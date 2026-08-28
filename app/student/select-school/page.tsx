"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Skeleton, Steps } from "@/components/ui";
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
      <div className="mx-auto max-w-xl space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const available = schools.filter((s) => s.id === student.schoolId);

  function proceed() {
    if (!selected) return;
    setSessionSchoolId(selected);
    router.push("/student/credentials");
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <Steps current={1} labels={["Connect", "Credential", "Statements", "Proof"]} />

      <header>
        <h1 className="title text-4xl">Select your institution</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
          Choose the institution holding your record.
        </p>
      </header>

      <div className="rows sheet">
        {available.map((s) => {
          const on = selected === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              aria-pressed={on}
              className={`focusable flex w-full items-center justify-between px-6 py-5 text-left transition-colors ${
                on ? "bg-seal-50" : "hover:bg-paper-deep/60"
              }`}
            >
              <div>
                <div className="text-[15px] text-ink">{s.name}</div>
                <div className="mt-0.5 text-xs text-ink-faint">{s.country}</div>
              </div>
              {on && (
                <span className="text-[11px] uppercase tracking-wider text-seal-600">selected</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={proceed} disabled={!selected}>Continue</Button>
      </div>
    </div>
  );
}
