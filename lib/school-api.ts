// Client for a school's GraphQL endpoint.
//
// Every call here runs in the BROWSER, never on an EduProof server. That is
// the whole architecture in one sentence: the record crosses from the school
// straight to the student's device, and the proof backend never sees it.
//
// Each school is reached at its own path, because each is an independent
// vendor with its own system:
//
//   /api/school/{schoolId}/graphql       the Vercel demo, one path per school
//   http://localhost:4000/{schoolId}/graphql   a school service running on its own
//
// The base is configurable via NEXT_PUBLIC_SCHOOL_API; every function below
// takes the schoolId it is asking about and builds the full path from it.

import type { Degree, School, Student, StudentStatus } from "@/types";

const BASE = process.env.NEXT_PUBLIC_SCHOOL_API ?? "/api/school";

function endpointFor(schoolId: string): string {
  return `${BASE}/${schoolId}/graphql`;
}

export interface StudentSummary {
  id: string;
  name: string;
  schoolId: string;
}

/**
 * What the school issues and signs.
 *
 * `attributes` is the private witness: it stays on this device and is never
 * sent to EduProof. Note there is no `issuerPublicKey` here — a key travelling
 * with the credential it signs would prove nothing. Verifiers read the key
 * from the school profile instead.
 */
export interface SignedCredential {
  schema: string;
  issuer: { schoolId: string; schoolName: string; keyId: string };
  subject: string;
  attributes: {
    status: string;
    gpaScaled: number;
    gpaScale: number;
    academicYear: number;
    degree: string;
    major: string;
  };
  issuedAt: string;
  expiresAt: string;
  signature: string;
  /**
   * Schnorr over the canonical field vector — what a circuit verifies.
   * Present only when a subject commitment was supplied, because the vector
   * binds the credential to its holder.
   */
  circuitSignature?: {
    announcement: { x: string; y: string };
    response: string;
  } | null;
  /** The sixteen field elements the circuit signature covers, as decimals. */
  circuitVector?: string[] | null;
}

interface SchoolProfileResponse {
  id: string;
  name: string;
  shortName: string;
  country: string;
  issuerKeyId: string;
  issuerPublicKey: string;
  /** The JubJub key the on-chain issuer registry holds. */
  circuitPublicKey: { x: string; y: string };
}

async function query<T>(
  schoolId: string,
  gql: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch(endpointFor(schoolId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: gql, variables }),
  });

  if (!res.ok) throw new Error(`School API returned ${res.status}`);

  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

const SCHOOL_FIELDS = `
  id
  name
  shortName
  country
  issuerKeyId
  issuerPublicKey
`;

/**
 * The JubJub public key the circuit checks issuer signatures against.
 *
 * Separate from fetchSchoolProfile because only the proving path needs it, and
 * every other caller would be paying for a field it ignores.
 */
export async function fetchCircuitPublicKey(schoolId: string): Promise<{ x: bigint; y: bigint }> {
  const { school } = await query<{ school: { circuitPublicKey: { x: string; y: string } } }>(
    schoolId,
    `query CircuitKey { school { circuitPublicKey { x y } } }`
  );
  return { x: BigInt(school.circuitPublicKey.x), y: BigInt(school.circuitPublicKey.y) };
}

/** The institution's public profile, including the key verifiers check against. */
export async function fetchSchoolProfile(schoolId: string): Promise<School> {
  const { school } = await query<{ school: SchoolProfileResponse }>(
    schoolId,
    `query SchoolProfile { school { ${SCHOOL_FIELDS} } }`
  );

  return {
    id: school.id,
    name: school.name,
    shortName: school.shortName,
    country: school.country,
    issuerKeyId: school.issuerKeyId,
    issuerPublicKey: school.issuerPublicKey,
    verified: true,
  };
}

/**
 * Collects a signed credential.
 *
 * `subjectCommitment` is the student's public commitment to a secret only they
 * hold. Supplying it asks the school for the circuit-facing signature as well;
 * omitting it returns the conventional credential alone.
 */
export async function fetchCredential(
  schoolId: string,
  studentId: string,
  subjectCommitment?: string
): Promise<SignedCredential> {
  const { credential } = await query<{ credential: SignedCredential }>(
    schoolId,
    `query Credential($studentId: ID!, $subjectCommitment: String) {
       credential(studentId: $studentId, subjectCommitment: $subjectCommitment) {
         schema
         issuer { schoolId schoolName keyId }
         subject
         attributes { status gpaScaled gpaScale academicYear degree major }
         issuedAt
         expiresAt
         signature
         circuitVector
         circuitSignature { announcement { x y } response }
       }
     }`,
    { studentId, subjectCommitment: subjectCommitment ?? null }
  );

  if (!credential) throw new Error(`No credential for ${studentId}`);
  return credential;
}

/**
 * The demo's student picker.
 *
 * Not part of the integration contract — a real school authenticates the
 * student rather than offering a roster to choose from.
 */
export async function fetchDemoRoster(schoolId: string): Promise<StudentSummary[]> {
  const { demoRoster } = await query<{ demoRoster: StudentSummary[] }>(
    schoolId,
    `query DemoRoster { demoRoster { id name schoolId } }`
  );
  return demoRoster;
}

/**
 * The registrar's own view — full records, attributes included.
 *
 * This is the institution reading data it already owns, which is why it may
 * see everything. A production endpoint authenticates staff before answering;
 * this demo does not, which is exactly why the schema marks it registrar-only.
 * It is NOT how a student's credential reaches the app.
 */
export async function fetchRegistrar(schoolId: string): Promise<Student[]> {
  const { registrar } = await query<{ registrar: RegistrarRecord[] }>(
    schoolId,
    `query Registrar {
       registrar {
         id name schoolId status gpaScaled gpaScale
         academicYear degree major enrolledAt expiresAt
       }
     }`
  );

  return registrar.map(toStudent);
}

interface RegistrarRecord {
  id: string;
  name: string;
  schoolId: string;
  status: string;
  gpaScaled: number;
  gpaScale: number;
  academicYear: number;
  degree: string;
  major: string;
  enrolledAt: string;
  expiresAt: string;
}

/** GraphQL enums are SCREAMING_CASE; the UI model uses friendlier values. */
function toStudent(r: RegistrarRecord): Student {
  return {
    id: r.id,
    schoolId: r.schoolId,
    name: r.name,
    status: r.status.toLowerCase() as StudentStatus,
    gpaScaled: r.gpaScaled,
    academicYear: r.academicYear,
    degree: toDegree(r.degree),
    major: r.major,
    enrolledAt: r.enrolledAt,
    expiresAt: r.expiresAt,
  };
}

export function toDegree(value: string): Degree {
  const map: Record<string, Degree> = {
    BACHELOR: "Bachelor",
    MASTER: "Master",
    PHD: "PhD",
  };
  return map[value.toUpperCase()] ?? "Bachelor";
}
