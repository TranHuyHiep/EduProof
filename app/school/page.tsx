"use client";
import { useMemo, useState } from "react";
import { Panel, Badge, StatusBadge, EmptyState } from "@/components/ui";
import { getSchools, searchStudents } from "@/lib/data";

export default function SchoolPage() {
  const schools = getSchools();
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? "");
  const [query, setQuery] = useState("");

  const school = schools.find((s) => s.id === schoolId);
  const rows = useMemo(() => searchStudents(query, schoolId), [query, schoolId]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">School directory</h1>
          <p className="mt-1 text-sm text-slate-600">
            Records held by the issuing institution. Read-only in this prototype.
          </p>
        </div>
        {school?.verified && <Badge tone="success">✓ Verified issuer</Badge>}
      </header>

      <div className="flex flex-wrap gap-3">
        {schools.length > 1 && (
          <select
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            className="focusable rounded-xl border border-line bg-white px-3 py-2.5 text-sm"
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        <div className="relative min-w-[240px] flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, student ID or major…"
            aria-label="Search students"
            className="focusable w-full rounded-xl border border-line bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-slate-400"
          />
        </div>
      </div>

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-sm font-medium text-slate-900">{school?.name}</h2>
          <span className="text-xs text-slate-500">
            {rows.length} {rows.length === 1 ? "record" : "records"}
          </span>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon="⌕"
            title="No matching students"
            body={`Nothing matches “${query}”. Try a different name, ID or major.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5 font-medium">Student ID</th>
                  <th className="px-3 py-2.5 font-medium">Name</th>
                  <th className="px-3 py-2.5 font-medium">Major</th>
                  <th className="px-3 py-2.5 font-medium">Year</th>
                  <th className="px-3 py-2.5 font-medium">GPA</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-0 hover:bg-slate-50/70">
                    <td className="mono px-5 py-3 text-slate-600">{s.id}</td>
                    <td className="px-3 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-3 py-3 text-slate-600">{s.major}</td>
                    <td className="px-3 py-3 text-slate-600">Year {s.academicYear}</td>
                    <td className="px-3 py-3 tabular-nums text-slate-900">{s.gpa.toFixed(2)}</td>
                    <td className="px-5 py-3"><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className="text-xs text-slate-500">
        This view is what the institution sees. Students disclose none of it directly —
        they generate proofs about it.
      </p>
    </div>
  );
}
