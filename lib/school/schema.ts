// EduProof School Integration Schema v1.
//
// This is a PUBLIC CONTRACT, not a mock convenience. A university that wants to
// work with EduProof exposes a GraphQL endpoint implementing this schema. The
// implementation below stands in for one such university.
//
// Two zones, and the split is the point:
//
//   • registrar zone — the institution reading records it already owns.
//                      Requires staff authentication.
//   • student zone   — a student collecting their own signed credential.
//                      Returns exactly one record: theirs.
//
// EduProof itself queries neither. The student's browser talks to the school
// directly, so no attribute value ever reaches an EduProof server.

import { buildSchema, graphql, type GraphQLSchema } from "graphql";
import { issueCredential } from "./credential.ts";
import { issuerPublicKey } from "./keys.ts";
import type { SchoolProfile, StudentRecord } from "./types.ts";

export const typeDefs = /* GraphQL */ `
  """
  EduProof School Integration Schema v1.
  Implement this to let your students prove facts about their records
  without disclosing the records themselves.
  """
  scalar DateTime

  enum StudentStatus {
    ACTIVE
    GRADUATED
    SUSPENDED
  }

  enum Degree {
    BACHELOR
    MASTER
    PHD
  }

  "Publicly readable facts about the institution."
  type School {
    id: ID!
    name: String!
    shortName: String!
    country: String!
    "Identifier of the signing key currently in use."
    issuerKeyId: String!
    """
    Ed25519 public key, base64 SPKI.
    A verifier must obtain this from a trusted registry — never from the
    credential it is checking, which would prove nothing.
    """
    issuerPublicKey: String!
  }

  """
  The private witness.
  Every value is an integer or an enum so a zero-knowledge circuit can read it
  without a lossy conversion.
  """
  type CredentialAttributes {
    status: StudentStatus!
    "GPA multiplied by gpaScale. 372 with a scale of 100 means 3.72."
    gpaScaled: Int!
    gpaScale: Int!
    academicYear: Int!
    degree: Degree!
    major: String!
  }

  type CredentialIssuer {
    schoolId: ID!
    schoolName: String!
    keyId: String!
  }

  """
  A signed credential. Held only on the student's device.
  The signature covers the RFC 8785 canonical JSON of every field except
  the signature itself.
  """
  type SignedCredential {
    schema: String!
    issuer: CredentialIssuer!
    "Opaque subject identifier, as the school knows the student."
    subject: ID!
    attributes: CredentialAttributes!
    issuedAt: DateTime!
    expiresAt: DateTime!
    "Ed25519 over the canonical form, base64."
    signature: String!
  }

  "A full record. Registrar zone only."
  type StudentRecord {
    id: ID!
    name: String!
    schoolId: ID!
    status: StudentStatus!
    gpaScaled: Int!
    gpaScale: Int!
    academicYear: Int!
    degree: Degree!
    major: String!
    enrolledAt: DateTime!
    expiresAt: DateTime!
  }

  "Identity only — no attributes."
  type StudentSummary {
    id: ID!
    name: String!
    schoolId: ID!
  }

  type Query {
    "Public profile, including the issuer public key."
    school: School!

    """
    Issue a signed credential to the student who requests it.
    A production implementation authenticates the caller and ignores any
    identifier but their own. This demo trusts the argument.
    """
    credential(studentId: ID!): SignedCredential

    """
    Every record the institution holds. REGISTRAR ROLE REQUIRED.
    A production implementation MUST authenticate staff here; this endpoint
    returns the very data EduProof exists to keep private.
    """
    registrar(schoolId: ID): [StudentRecord!]!

    """
    Roster listing for the demo's student picker.
    NOT part of the integration contract — a real school would authenticate
    the student instead of letting them choose an identity from a list.
    Implementations may omit this field.
    """
    demoRoster(schoolId: ID): [StudentSummary!]!
  }
`;

let schema: GraphQLSchema | null = null;

function getSchema(): GraphQLSchema {
  if (!schema) schema = buildSchema(typeDefs);
  return schema;
}

export interface SchoolData {
  school: SchoolProfile;
  students: StudentRecord[];
}

/** Resolvers, as a root value. Small enough that a resolver map earns nothing. */
function rootValue(data: SchoolData) {
  const inSchool = (schoolId?: string) =>
    schoolId ? data.students.filter((s) => s.schoolId === schoolId) : data.students;

  return {
    school: () => ({ ...data.school, issuerPublicKey: issuerPublicKey() }),

    credential: ({ studentId }: { studentId: string }) => {
      const student = data.students.find((s) => s.id === studentId);
      if (!student) throw new Error(`No student ${studentId}`);
      return issueCredential(student, data.school);
    },

    registrar: ({ schoolId }: { schoolId?: string }) => inSchool(schoolId),

    demoRoster: ({ schoolId }: { schoolId?: string }) =>
      inSchool(schoolId).map(({ id, name, schoolId: sid }) => ({ id, name, schoolId: sid })),
  };
}

export interface GraphQLRequest {
  query: string;
  variables?: Record<string, unknown> | null;
  operationName?: string | null;
}

/**
 * Executes one GraphQL request against the school's data.
 *
 * Transport-free on purpose: both the standalone server and the Next.js route
 * call this, so the two can never drift apart.
 */
export async function executeSchoolQuery(request: GraphQLRequest, data: SchoolData) {
  return graphql({
    schema: getSchema(),
    source: request.query,
    rootValue: rootValue(data),
    variableValues: request.variables ?? undefined,
    operationName: request.operationName ?? undefined,
  });
}
