// A local harness for running the circuit without a chain.
//
// The circuit is the part of EduProof that cannot be tested by clicking
// through the UI: it either constrains what it claims to constrain, or it
// quietly proves nothing. So this file builds the whole setting — a school
// with a signing key, a student with a secret, a signed credential — and lets
// a test drive circuits against it.
//
// Proofs are not generated here. `--skip-zk` style execution runs the circuit
// logic and its assertions, which is what the tests are about; producing an
// actual proof would add minutes per case and test the prover, not us.

import {
  CompactTypeField,
  CompactTypeVector,
  createCircuitContext,
  createConstructorContext,
  dummyContractAddress,
  jubjubSchnorrSign,
  jubjubSchnorrVerifyingKey,
  sampleJubjubSchnorrSk,
  transientHash,
  type CircuitContext,
  type JubjubPoint,
  type JubjubSchnorrSignature,
} from "@midnight-ntwrk/compact-runtime";

import {
  Contract,
  ledger,
  type Ledger,
} from "../build/eduproof/contract/index.js";

/** The message type the issuer signs: the whole sixteen-slot vector. */
export const CREDENTIAL_TYPE = new CompactTypeVector(16, CompactTypeField);

/** What the wallet keeps to itself. The witness reads this and nothing else. */
export interface StudentPrivateState {
  studentSk: bigint;
}

const COIN_PUBLIC_KEY = "0".repeat(64);

/**
 * A school that can issue credentials.
 *
 * In production this key lives in the registrar's HSM and the public half goes
 * on chain. Here it is a scalar, sampled per test run so no fixture can
 * accidentally depend on a fixed key.
 */
export class School {
  readonly sk: bigint;
  readonly pk: JubjubPoint;

  constructor() {
    this.sk = sampleJubjubSchnorrSk();
    this.pk = jubjubSchnorrVerifyingKey(this.sk);
  }

  sign(credential: bigint[]): JubjubSchnorrSignature {
    return jubjubSchnorrSign(CREDENTIAL_TYPE, credential, this.sk);
  }
}

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

  private context(circuitId: string): CircuitContext<StudentPrivateState> {
    return createCircuitContext<StudentPrivateState>(
      circuitId,
      dummyContractAddress(),
      COIN_PUBLIC_KEY,
      this.state.currentContractState,
      this.state.currentPrivateState,
    );
  }

  /**
   * Carries the ledger and private state forward, so a later circuit call sees
   * what an earlier one wrote — registerIssuer before a proof, for instance.
   *
   * `currentContractState` is a WASM-backed object, so its `data` is assigned
   * rather than the object being rebuilt: a spread would produce a plain
   * object the runtime refuses on the next call.
   */
  private commit(result: { context: CircuitContext<StudentPrivateState> }): void {
    const call = result.context.callContext;
    this.state.currentContractState.data = call.currentQueryContext.state;
    if (call.currentPrivateState !== undefined) {
      this.state.currentPrivateState = call.currentPrivateState;
    }
  }

  async registerIssuer(schoolIdHash: bigint, issuerPk: JubjubPoint): Promise<void> {
    const result = await this.contract.impureCircuits.registerIssuer(
      this.context("registerIssuer"),
      schoolIdHash,
      issuerPk,
    );
    this.commit(result);
  }

  async proveCredentialPredicate(args: {
    schoolIdHash: bigint;
    subject: bigint;
    slot: number | bigint;
    op: number | bigint;
    operand: bigint;
    credential: bigint[];
    signature: JubjubSchnorrSignature;
  }): Promise<boolean> {
    const result = await this.contract.impureCircuits.proveCredentialPredicate(
      this.context("proveCredentialPredicate"),
      args.schoolIdHash,
      args.subject,
      BigInt(args.slot),
      BigInt(args.op),
      args.operand,
      args.credential,
      args.signature,
    );
    this.commit(result);
    return result.result;
  }
}
