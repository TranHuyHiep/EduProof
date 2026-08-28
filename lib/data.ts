// School reference data only.
//
// Student records deliberately do NOT live here. They belong to the school and
// reach the student's browser directly from the school's API (lib/school-api).
// If you find yourself adding a getStudent() to this file, the architecture
// has sprung a leak.

import schoolsJson from "@/data/schools.json";
import type { School } from "@/types";

const schools = schoolsJson.schools as School[];

export function getSchools(): School[] {
  return schools;
}

export function getSchool(schoolId: string): School | undefined {
  return schools.find((s) => s.id === schoolId);
}
