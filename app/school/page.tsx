"use client";
import { useEffect, useMemo, useState } from "react";
import { Button, EmptyState, SchoolBoundaryNote, Skeleton, StatusTag } from "@/components/ui";
import { IconAlert, IconSearch } from "@/components/icons";
import { getSchools } from "@/lib/data";
import { fetchRegistrar } from "@/lib/school-api";
import { formatGpa, type Student } from "@/types";

const SIMULATED_ACK_KEY = "eduproof.school.simulated-ack";

/**
 * The registrar's view — the institution reading records it already owns.
 *
 * This is the only screen in the app that shows attribute values, and it is
 * deliberately framed as the school's own system rather than as EduProof's.
 */
export default function RegistryPage() {
  const schools = getSchools();
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<Student[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const school = schools.find((s) => s.id === schoolId);

  // Re-warns every tab: sessionStorage rather than localStorage, so this never
  // reads as "permanently confirmed" the way a persistent dismiss would.
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SIMULATED_ACK_KEY) === "1") setAcknowledged(true);
    } catch {}
  }, []);

  function acknowledge() {
    setAcknowledged(true);
    try { window.sessionStorage.setItem(SIMULATED_ACK_KEY, "1"); } catch {}
  }

  useEffect(() => {
    setRecords(null);
    fetchRegistrar(schoolId)
      .then((r) => { setRecords(r); setError(null); })
      .catch((e: Error) => { setError(e.message); setRecords([]); });
  }, [schoolId]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!records) return [];
    if (!q) return records;
    return records.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.major.toLowerCase().includes(q),
    );
  }, [query, records]);

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <p className="eyebrow">{school?.name ?? "Institution"}</p>
        <h1 className="title mt-3 text-4xl">Student registry</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          What the institution sees. Students disclose none of it directly — they
          generate proofs about it, and the values below never reach a verifier.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        {schools.length > 1 && (
          <select
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            className="focusable border border-rule bg-surface px-3 py-2 text-sm"
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        <div className="relative min-w-[16rem] flex-1">
          <IconSearch
            size={1}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, ID or field of study"
            className="focusable w-full border border-rule bg-surface py-2 pl-9 pr-3 text-sm placeholder:text-ink-faint"
          />
        </div>

        <span className="text-xs tabular-nums text-ink-faint">
          {records === null ? "loading" : `${rows.length} of ${records.length}`}
        </span>
      </div>

      <div className="relative">
        {!acknowledged && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper/95 p-6 backdrop-blur-sm">
            <div className="sheet max-w-sm p-6 text-center">
              <IconAlert size={1.4} className="mx-auto text-caution" />
              <p className="title mt-4 text-lg">Simulated data</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                These ten students are fixtures for this demo, not real academic
                records. No institution&rsquo;s actual data appears here.
              </p>
              <Button onClick={acknowledge} className="mt-5">
                Understood
              </Button>
            </div>
          </div>
        )}

        {error ? (
          <div className="sheet">
            <EmptyState
              icon={<IconAlert />}
              title="The institution's system did not answer"
              body={error}
            />
          </div>
        ) : records === null ? (
          <div className="space-y-px border border-rule bg-rule-soft">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 bg-surface" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="sheet">
            <EmptyState
              icon={<IconSearch />}
              title="No matching records"
              body="Try a different name, student ID or field of study."
            />
          </div>
        ) : (
          <>
            {/* Desktop: a ledger. */}
            <div className="hidden border border-rule bg-surface md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="rule text-left">
                    {["Student ID", "Name", "Field of study", "Year", "Average", "Status"].map((h) => (
                      <th key={h} className="eyebrow px-5 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="rows">
                  {rows.map((s) => (
                    <tr key={s.id} className="transition-colors hover:bg-paper-deep/60">
                      <td className="mono px-5 py-3.5 text-xs text-ink-faint">{s.id}</td>
                      <td className="px-5 py-3.5 text-ink">{s.name}</td>
                      <td className="px-5 py-3.5 text-ink-soft">{s.major}</td>
                      <td className="px-5 py-3.5 tabular-nums text-ink-soft">{s.academicYear}</td>
                      <td className="px-5 py-3.5 tabular-nums text-ink">{formatGpa(s.gpaScaled)}</td>
                      <td className="px-5 py-3.5"><StatusTag status={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: the same record as a stacked entry, so nothing is cut off. */}
            <div className="rows border border-rule bg-surface md:hidden">
              {rows.map((s) => (
                <div key={s.id} className="p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[15px] text-ink">{s.name}</span>
                    <StatusTag status={s.status} />
                  </div>
                  <div className="mono mt-1 text-[11px] text-ink-faint">{s.id}</div>
                  <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <dt className="text-ink-faint">Field</dt>
                      <dd className="mt-0.5 text-ink-soft">{s.major}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">Year</dt>
                      <dd className="mt-0.5 tabular-nums text-ink-soft">{s.academicYear}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">Average</dt>
                      <dd className="mt-0.5 tabular-nums text-ink">{formatGpa(s.gpaScaled)}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <SchoolBoundaryNote />
    </div>
  );
}
