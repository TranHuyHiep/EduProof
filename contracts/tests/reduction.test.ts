// The reduction witness, and whether a dishonest prover can get past it.
//
// Hand-rolling Schnorr added a witness the built-in did not have:
// `getSchnorrReduction` lets the prover supply the split of the challenge
// hash, because dividing inside a circuit is expensive and checking a division
// is cheap. That is only sound if the check is airtight — a prover who could
// choose the challenge freely could forge a signature for any key.
//
// So these tests supply deliberately wrong splits and require the circuit to
// refuse. See contracts/src/schnorr.compact.
import { beforeEach, describe, expect, it } from "vitest";
import { constructJubjubPoint, createCircuitContext, createConstructorContext,
         dummyContractAddress } from "@midnight-ntwrk/compact-runtime";
import { Contract } from "../build/eduproof/contract/index.js";
import { School, subjectCommitment } from "./simulator.ts";
import { reduction, TWO_248 } from "../../lib/midnight/schnorr.ts";

const COIN = "0".repeat(64);
const STUDENT_SK = 42n;
const SCHOOL_ID = 111n;

async function run(badReduction: (h: bigint) => [bigint, bigint]) {
  const school = await School.create();
  const contract = new Contract<{ studentSk: bigint }>({
    studentSecretKey: (c) => [c.privateState, c.privateState.studentSk],
    getSchnorrReduction: (c, h) => [c.privateState, badReduction(h)],
  });
  let state = await contract.initialState(
    createConstructorContext({ studentSk: STUDENT_SK }, COIN));
  const ctx = () => createCircuitContext<{studentSk:bigint}>(
    dummyContractAddress(), COIN, state.currentContractState, state.currentPrivateState);

  const r1 = await contract.impureCircuits.registerIssuer(ctx(), SCHOOL_ID, school.pk);
  state.currentContractState.data = r1.context.currentQueryContext.state;

  const subject = subjectCommitment(STUDENT_SK);
  const cred = Array.from({length:16},(_,i)=> i===0?SCHOOL_ID : i===1?subject : i===3?372n : 0n);
  const sig = await school.sign(cred);

  return contract.impureCircuits.proveCredentialPredicate(
    ctx(), SCHOOL_ID, subject, 3n, 2n, 350n, cred,
    { announcement: constructJubjubPoint(sig.announcement.x, sig.announcement.y),
      response: sig.response });
}

describe("the reduction witness is constrained", () => {
  it("accepts the honest split", async () => {
    const r = await run(reduction);
    expect(r.result).toBe(true);
  });

  it("rejects a quotient of zero (claiming the hash is already small)", async () => {
    await expect(run((h) => [0n, h % TWO_248])).rejects.toThrow();
  });

  it("rejects an out-of-range quotient", async () => {
    await expect(run((h) => [200n, h % TWO_248])).rejects.toThrow();
  });

  it("rejects a shifted split that still reconstructs arithmetically", async () => {
    // q-1 and remainder+2^248: reconstructs, but remainder exceeds 248 bits.
    await expect(run((h) => {
      const [q, rest] = reduction(h);
      return q > 0n ? [q - 1n, rest + TWO_248] : [q, rest];
    })).rejects.toThrow();
  });
});
