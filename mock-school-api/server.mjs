// Mock School API — stands in for a university's own GraphQL endpoint.
//
// The point it demonstrates: the student record lives HERE, on the school's
// side of an organisational boundary. EduProof never stores it. The browser
// fetches a signed credential directly from this service, so the proof
// backend never sees a GPA.
//
// Deliberately minimal: no framework, no database, no build step.
//   node server.mjs   →   http://localhost:4000/graphql

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { sign as signBytes, generateKeyPairSync } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PORT = 4000;
const ORIGIN = process.env.ALLOWED_ORIGIN ?? "http://localhost:3000";

const here = dirname(fileURLToPath(import.meta.url));
const { students } = JSON.parse(readFileSync(join(here, "../data/students.json"), "utf8"));
const { schools } = JSON.parse(readFileSync(join(here, "../data/schools.json"), "utf8"));

// Issuer keypair. Regenerated on every boot — fine for a demo, since the
// public key travels with each credential. A real issuer would load a
// long-lived key from a KMS.
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const issuerPublicKey = publicKey.export({ format: "pem", type: "spki" }).toString();

const KEY_ID = "mock-issuer-2026";

/** Signs the attribute set so a verifier can tell it came from the school. */
function issueCredential(student) {
  const school = schools.find((s) => s.id === student.schoolId);

  const body = {
    schema: "eduproof/credential/v1",
    issuer: { schoolId: student.schoolId, schoolName: school?.name ?? student.schoolId, keyId: KEY_ID },
    subject: student.id,
    attributes: {
      status: student.status,
      gpa: student.gpa,
      academicYear: student.academicYear,
      degree: student.degree,
      major: student.major,
    },
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(student.expiresAt).toISOString(),
  };

  // Ed25519 signs the message directly — no separate digest step.
  const signature = signBytes(null, Buffer.from(JSON.stringify(body)), privateKey)
    .toString("base64");

  return { ...body, signature, issuerPublicKey };
}

// --- A GraphQL-shaped endpoint, hand-rolled ------------------------------
// Three fields is not worth a schema library. Requests look like real
// GraphQL from the client's side, which is all the demo needs.

function resolve(query, variables = {}) {
  if (/\bschools\b/.test(query)) {
    return { schools: schools.map(({ id, name, shortName, country, verified }) => ({ id, name, shortName, country, verified })) };
  }

  if (/\bregistrar\b/.test(query)) {
    // The school's own view of its records — full attributes, because this is
    // the institution looking at data it already owns.
    const list = variables.schoolId
      ? students.filter((s) => s.schoolId === variables.schoolId)
      : students;
    return { registrar: list };
  }

  if (/\bstudents\b/.test(query)) {
    const list = variables.schoolId
      ? students.filter((s) => s.schoolId === variables.schoolId)
      : students;
    // Only what a chooser needs — no attributes leak from the listing.
    return { students: list.map(({ id, name, schoolId }) => ({ id, name, schoolId })) };
  }

  if (/\bcredential\b/.test(query)) {
    const student = students.find((s) => s.id === variables.studentId);
    if (!student) return { errors: [{ message: `No student ${variables.studentId}` }] };
    return { credential: issueCredential(student) };
  }

  return { errors: [{ message: "Unknown query" }] };
}

const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

createServer((req, res) => {
  if (req.method === "OPTIONS") return res.writeHead(204, cors).end();

  if (req.method !== "POST" || !req.url.startsWith("/graphql")) {
    return res.writeHead(404, cors).end("POST /graphql");
  }

  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    let payload;
    try {
      const { query, variables } = JSON.parse(raw);
      const result = resolve(query, variables);
      payload = result.errors ? result : { data: result };
    } catch (err) {
      console.error("Request failed:", err);
      payload = { errors: [{ message: err.message }] };
    }
    res.writeHead(200, { ...cors, "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
  });
}).listen(PORT, () => {
  console.log(`Mock School API  →  http://localhost:${PORT}/graphql`);
  console.log(`CORS origin      →  ${ORIGIN}`);
  console.log(`Students loaded  →  ${students.length}`);
});
