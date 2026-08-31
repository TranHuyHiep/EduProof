// The school's on-chain identity, computed three times by three callers.
//
// A proof works only if all three agree:
//
//   scripts/register-issuer.mjs   hashToField(school.id)
//     — the key under which the issuer is written to the contract's ledger
//   lib/midnight/prover.ts        schoolIdHash(student.schoolId)
//     — the key the app looks up when proving
//   slot 0 of the signed vector   hashToField(body.issuer.schoolId)
//     — what the circuit reads out of the credential itself
//
// Disagreement is silent and expensive. The contract would hold a key nobody
// looks up, every proof would fail with "unknown issuer", and finding out
// costs a transaction plus a two-hour wallet sync. The three call sites reach
// the value by three different routes — one reads schools.json directly
// because plain Node cannot resolve the `@/` alias — so nothing but a test
// keeps them together.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { loadSchoolData } from "@/lib/school/data";
import { schoolIdHash } from "@/lib/midnight/encoding";
import { hashToField, toCircuitVector } from "@/lib/school/circuit-vector";
import { issueCredential } from "@/lib/school/credential";

describe("the school's identity on chain", () => {
  it("is the same value however it is reached", () => {
    const { school, students } = loadSchoolData("hanoi-university");
    const credential = issueCredential(students[0], school);

    // Exactly what register-issuer.mjs does: read the JSON, hash `id`.
    const fromJson = JSON.parse(readFileSync("data/schools.json", "utf8")).schools[0];
    const registerScript = hashToField(fromJson.id);

    const app = schoolIdHash(students[0].schoolId);
    const signedVector = toCircuitVector(credential, 12345n)[0];

    expect(app).toBe(registerScript);
    expect(signedVector).toBe(registerScript);
  });

  it("is stable across students of the same school", () => {
    // Slot 0 comes from the credential, so a second student must not produce
    // a different issuer.
    const { school, students } = loadSchoolData("hanoi-university");
    const expected = hashToField(school.id);

    for (const student of students.slice(0, 3)) {
      const vector = toCircuitVector(issueCredential(student, school), 999n);
      expect(vector[0]).toBe(expected);
    }
  });
});
