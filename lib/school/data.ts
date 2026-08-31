// Loads the school's own records.
//
// JSON files stand in for a student information system. A real integration
// would query the SIS here; nothing else in this module would change.

import schoolsJson from "@/data/schools.json";
import studentsJson from "@/data/students.json";
import { GPA_SCALE } from "./canonical.ts";
import type { SchoolData } from "./schema.ts";
import type { SchoolProfile, StudentRecord } from "./types.ts";

/** Files store human-readable values; the schema exposes GraphQL enums. */
const toEnum = <T extends string>(value: string): T => value.toUpperCase() as T;

/**
 * Loads one school's own data — its profile, and only ITS students.
 *
 * Each school is an independent vendor with its own system; a real
 * institution's database has no path to another institution's records, so
 * neither does this. Throws on an unknown id rather than silently returning
 * nothing, so a typo in a route or a stale link fails loudly.
 */
export function loadSchoolData(schoolId: string): SchoolData {
  const raw = schoolsJson.schools.find((s) => s.id === schoolId);
  if (!raw) throw new Error(`Unknown school: ${schoolId}`);

  const school: SchoolProfile = {
    id: raw.id,
    name: raw.name,
    shortName: raw.shortName,
    country: raw.country,
    issuerKeyId: raw.issuerKeyId,
    // Filled in by the resolver from the live signing key.
    issuerPublicKey: "",
  };

  const students: StudentRecord[] = studentsJson.students
    .filter((s) => s.schoolId === schoolId)
    .map((s) => ({
      id: s.id,
      schoolId: s.schoolId,
      name: s.name,
      status: toEnum<StudentRecord["status"]>(s.status),
      gpaScaled: s.gpaScaled,
      gpaScale: GPA_SCALE,
      academicYear: s.academicYear,
      degree: toEnum<StudentRecord["degree"]>(s.degree),
      major: s.major,
      enrolledAt: s.enrolledAt,
      expiresAt: s.expiresAt,
    }));

  return { school, students };
}
