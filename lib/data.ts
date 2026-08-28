// Single access point for JSON-backed data.
// No React component should import the JSON files directly.

import schoolsJson from "@/data/schools.json";
import studentsJson from "@/data/students.json";
import type { School, Student } from "@/types";

const schools = schoolsJson.schools as School[];
const students = studentsJson.students as Student[];

export function getSchools(): School[] {
  return schools;
}

export function getSchool(schoolId: string): School | undefined {
  return schools.find((s) => s.id === schoolId);
}

export function getStudents(schoolId?: string): Student[] {
  return schoolId ? students.filter((s) => s.schoolId === schoolId) : students;
}

export function getStudent(studentId: string): Student | undefined {
  const id = studentId.trim().toUpperCase();
  return students.find((s) => s.id.toUpperCase() === id);
}

/** Case-insensitive search across id, name and major. */
export function searchStudents(query: string, schoolId?: string): Student[] {
  const pool = getStudents(schoolId);
  const q = query.trim().toLowerCase();
  if (!q) return pool;
  return pool.filter(
    (s) =>
      s.id.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.major.toLowerCase().includes(q),
  );
}
