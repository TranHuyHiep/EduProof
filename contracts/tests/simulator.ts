// A local harness for running the circuit without a chain.
//
// The circuit is the part of EduProof that cannot be tested by clicking
// through the UI: it either constrains what it claims to constrain, or it
// quietly proves nothing. So this file builds the whole setting — a student
// with a secret, a credential bound to them — and lets a test drive circuits
// against it.
//
// Proofs are not generated here. `--skip-zk` style execution runs the circuit
// logic and its assertions, which is what the tests are about; producing an
// actual proof would add minutes per case and test the prover, not us.
//
// There is no `School` here any more. The circuit no longer verifies an
// issuer signature, so there is nothing for a school to do that a test can
// observe — see the header of contracts/src/eduproof.compact.

import {
  CompactTypeField,
  CompactTypeVector,
  createCircuitContext,
  createConstructorContext,
  dummyContractAddress,
  transientHash,
  type CircuitContext,
} from "@midnight-ntwrk/compact-runtime";

import {
  Contract,
  ledger,
  type Ledger,
} from "../build/eduproof/contract/index.js";

/** The credential's type: the whole sixteen-slot vector. */
export const CREDENTIAL_TYPE = new CompactTypeVector(16, CompactTypeField);

/** What the wallet keeps to itself. The witness reads this and nothing else. */
export interface StudentPrivateState {
  studentSk: bigint;
}

const COIN_PUBLIC_KEY = "0".repeat(64);

/** The commitment a student publishes in place of an identity. */
export function subjectCommitment(studentSk: bigint): bigint {
  return transientHash(CompactTypeField, studentSk);
}

/**
 * The contract, its ledger, and the student's private state, wired together.
 *
 * `studentSk` is deliberately supplied through the witness rather than as an
 * argument: that is the private-state path the real wallet uses, so the tests
 * exercise it too.
 */
type ContractState = Awaited<
  ReturnType<Contract<StudentPrivateState>["initialState"]>
>;

export class Simulator {
  readonly contract: Contract<StudentPrivateState>;
  private state: ContractState;

  private constructor(contract: Contract<StudentPrivateState>, state: ContractState) {
    this.contract = contract;
    this.state = state;
  }

  static async create(privateState: StudentPrivateState): Promise<Simulator> {
    const contract = new Contract<StudentPrivateState>({
      // The one witness: the wallet hands over the student's secret key at
      // proving time. It never appears in a circuit argument, so no code that
      // builds a transaction ever holds it.
      studentSecretKey: (context) => [context.privateState, context.privateState.studentSk],
    });
    const state = await contract.initialState(
      createConstructorContext(privateState, COIN_PUBLIC_KEY),
    );
    return new Simulator(contract, state);
  }

  get ledger(): Ledger {
    return ledger(this.state.currentContractState.data);
  }

  get privateState(): StudentPrivateState {
    return this.state.currentPrivateState;
  }

  /** Replaces the wallet's private state — used to test the ownership check. */
  setPrivateState(privateState: StudentPrivateState): void {
    this.state = { ...this.state, currentPrivateState: privateState };
  }

  private context(): CircuitContext<StudentPrivateState> {
    return createCircuitContext<StudentPrivateState>(
      dummyContractAddress(),
      COIN_PUBLIC_KEY,
      this.state.currentContractState,
      this.state.currentPrivateState,
    );
  }

  /**
   * Carries the ledger and private state forward, so a later circuit call sees
   * what an earlier one wrote — the proof counter, for instance.
   *
   * `currentContractState` is a WASM-backed object, so its `data` is assigned
   * rather than the object being rebuilt: a spread would produce a plain
   * object the runtime refuses on the next call.
   */
  private commit(result: { context: CircuitContext<StudentPrivateState> }): void {
    const next = result.context;
    this.state.currentContractState.data = next.currentQueryContext.state;
    if (next.currentPrivateState !== undefined) {
      this.state.currentPrivateState = next.currentPrivateState;
    }
  }

  async proveCredentialPredicate(args: {
    schoolIdHash: bigint;
    subject: bigint;
    slot: number | bigint;
    op: number | bigint;
    operand: bigint;
    credential: bigint[];
  }): Promise<boolean> {
    const result = await this.contract.impureCircuits.proveCredentialPredicate(
      this.context(),
      args.schoolIdHash,
      args.subject,
      BigInt(args.slot),
      BigInt(args.op),
      args.operand,
      args.credential,
    );
    this.commit(result);
    return result.result;
  }
}
