// Client for the school's own GraphQL endpoint.
//
// Every call here runs in the BROWSER, never on the EduProof server. That is
// the whole point: the student record crosses from the school straight to the
// student's device, and the proof backend never sees an attribute value.
//
// In the demo the school is mock-school-api on :4000. In production it would
// be the university's real endpoint — same shape, different origin.

import type { School, Student } from "@/types";

const ENDPOINT = process.env.NEXT_PUBLIC_SCHOOL_API ?? "http://localhost:4000/graphql";

/** A student as the school lists them — identity only, no attributes. */
export interface StudentSummary {
  id: string;
  name: string;
  schoolId: string;
}

/**
 * What the school issues and signs. The `attributes` block is the private
 * witness: it stays on this device and is never sent to the EduProof backend.
 */
export interface SignedCredential {
  schema: string;
  issuer: { schoolId: string; schoolName: string; keyId: string };
  subject: string;
  attributes: {
    status: string;
    gpa: number;
    academicYear: number;
    degree: string;
    major: string;
  };
  issuedAt: string;
  expiresAt: string;
  signature: string;
  issuerPublicKey: string;
}

async function query<T>(gql: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: gql, variables }),
  });

  if (!res.ok) throw new Error(`School API returned ${res.status}`);

  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

export async function fetchSchools(): Promise<School[]> {
  const { schools } = await query<{ schools: School[] }>("{ schools }");
  return schools;
}

export async function fetchStudents(schoolId?: string): Promise<StudentSummary[]> {
  const { students } = await query<{ students: StudentSummary[] }>("{ students }", { schoolId });
  return students;
}

export async function fetchCredential(studentId: string): Promise<SignedCredential> {
  const { credential } = await query<{ credential: SignedCredential }>("{ credential }", { studentId });
  return credential;
}

/**
 * The school's own registry view — full records, including attributes.
 *
 * This is the institution reading data it already owns, which is why it may
 * see everything. It is NOT how a student's credential reaches the app.
 */
export async function fetchRegistrar(schoolId?: string): Promise<Student[]> {
  const { registrar } = await query<{ registrar: Student[] }>("{ registrar }", { schoolId });
  return registrar;
}
