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

export function loadSchoolData(): SchoolData {
  const raw = schoolsJson.schools[0];

  const school: SchoolProfile = {
    id: raw.id,
    name: raw.name,
    shortName: raw.shortName,
    country: raw.country,
    issuerKeyId: raw.issuerKeyId,
    // Filled in by the resolver from the live signing key.
    issuerPublicKey: "",
  };

  const students: StudentRecord[] = studentsJson.students.map((s) => ({
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
