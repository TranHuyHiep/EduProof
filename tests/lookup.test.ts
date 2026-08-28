// Parsing whatever a verifier pasted into the lookup box.
//
// The verifier is the one user who never signed up for anything, so this has
// to be forgiving about form and precise about failure.

import { describe, expect, it } from "vitest";
import { parseProofReference } from "@/lib/proof/lookup";

const ID = "pf_a6fce6019a53";

describe("accepts the shapes people actually paste", () => {
  it.each([
    ["a bare reference", ID],
    ["a full URL", `https://eduproof.example/verify/${ID}`],
    ["a localhost URL", `http://localhost:3000/verify/${ID}`],
    ["a URL with a query string", `https://eduproof.example/verify/${ID}?from=email`],
    ["surrounding whitespace", `  ${ID}  `],
    ["a newline from a copied email", `\n${ID}\n`],
  ])("%s", (_label, input) => {
    expect(parseProofReference(input)).toEqual({ proofId: ID, error: null });
  });

  it("normalises case, since references are lower-case hex", () => {
    expect(parseProofReference(ID.toUpperCase()).proofId).toBe(ID);
  });
});

describe("explains a failure instead of just refusing", () => {
  it("asks for input when the box is empty", () => {
    const { proofId, error } = parseProofReference("   ");
    expect(proofId).toBeNull();
    expect(error).toMatch(/paste/i);
  });

  it("says a link carried no reference, when it was a link", () => {
    const { proofId, error } = parseProofReference("https://eduproof.example/about");
    expect(proofId).toBeNull();
    expect(error).toMatch(/link/i);
  });

  it("describes the expected shape, when it was not a link", () => {
    const { proofId, error } = parseProofReference("my-proof-123");
    expect(proofId).toBeNull();
    expect(error).toMatch(/pf_/);
  });

  it("rejects a reference that is too short to be one", () => {
    expect(parseProofReference("pf_abc").proofId).toBeNull();
  });

  it("rejects non-hexadecimal characters", () => {
    expect(parseProofReference("pf_zzzzzzzzzzzz").proofId).toBeNull();
  });
});
