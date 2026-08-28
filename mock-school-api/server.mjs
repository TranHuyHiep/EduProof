// A university's GraphQL endpoint, run as a standalone service.
//
// This is the honest deployment shape: the school is a separate vendor with
// its own system, and the student's browser fetches from it directly. EduProof
// never sees an attribute value because it has no path to one.
//
// The Vercel demo folds an equivalent endpoint into the app at
// /api/school/graphql so the whole thing deploys as one project. Both shells
// call the SAME core in lib/school/, so they cannot drift apart.
//
//   npm run school          →  http://localhost:4000/graphql
//
// Requires Node 22+ for --experimental-strip-types (set by the npm script).

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { executeSchoolQuery } from "../lib/school/schema.ts";
import { GPA_SCALE } from "../lib/school/canonical.ts";

const PORT = Number(process.env.PORT ?? 4000);
const ORIGIN = process.env.ALLOWED_ORIGIN ?? "http://localhost:3000";

const here = dirname(fileURLToPath(import.meta.url));
const read = (name) => JSON.parse(readFileSync(join(here, "..", "data", name), "utf8"));

const toEnum = (value) => value.toUpperCase();

const { schools } = read("schools.json");
const { students } = read("students.json");

const data = {
  school: { ...schools[0], issuerPublicKey: "" },
  students: students.map((s) => ({
    ...s,
    status: toEnum(s.status),
    degree: toEnum(s.degree),
    gpaScale: GPA_SCALE,
  })),
};

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
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", async () => {
    let payload;
    try {
      payload = await executeSchoolQuery(JSON.parse(raw), data);
    } catch (err) {
      payload = { errors: [{ message: err.message }] };
    }
    res.writeHead(200, { ...cors, "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
  });
}).listen(PORT, () => {
  console.log(`School GraphQL  →  http://localhost:${PORT}/graphql`);
  console.log(`CORS origin     →  ${ORIGIN}`);
  console.log(`Records loaded  →  ${data.students.length}`);
});
