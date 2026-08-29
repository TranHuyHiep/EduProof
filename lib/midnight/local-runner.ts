// Executing the circuit in the browser.
//
// This runs the compiled contract against a local ledger state: the issuer
// registry is populated with the school's key, then the predicate circuit is
// called. Every assertion in the circuit applies — a bad signature or a caller
// who is not the holder throws here exactly as it would on chain.
//
// What it does not do is submit a transaction. That needs a funded wallet and
// a deployed contract; see DEPLOYMENT.md.
// The distinction is stated plainly in the UI rather than papered over: the
// circuit's verdict is real, its publication is not yet.

import type { CircuitContext, JubjubPoint } from "@midnight-ntwrk/compact-runtime";

import { reduction, type SchnorrSignature } from "./schnorr.ts";

/** The student's private state. Exactly one secret, and it never leaves. */
export interface StudentPrivateState {
  studentSk: bigint;
}

const COIN_PUBLIC_KEY = "0".repeat(64);

type ContractModule = typeof import("../../contracts/build/eduproof/contract/index.js");
type ContractInstance =
  import("../../contracts/build/eduproof/contract/index.js").Contract<StudentPrivateState>;
type ContractState = Awaited<ReturnType<ContractInstance["initialState"]>>;

export class Simulator {
  private constructor(
    private readonly module: ContractModule,
    private readonly contract: ContractInstance,
    private state: ContractState,
    private readonly runtime: typeof import("@midnight-ntwrk/compact-runtime"),
  ) {}

  static async create(studentSk: bigint): Promise<Simulator> {
    const [module, runtime] = await Promise.all([
      import("../../contracts/build/eduproof/contract/index.js"),
      import("@midnight-ntwrk/compact-runtime"),
    ]);

    const contract = new module.Contract<StudentPrivateState>({
      // The one witness. The runtime calls back into private state for the
      // secret, so no code assembling a transaction ever holds it.
      studentSecretKey: (context) => [context.privateState, context.privateState.studentSk],

      // The circuit hashes the Schnorr challenge itself and asks for it to be
      // split, because dividing in a circuit is expensive and checking a
      // division is not. It verifies the split, so this cannot lie.
      getSchnorrReduction: (context, challengeHash) => [
        context.privateState,
        reduction(challengeHash),
      ],
    });

    const state = await contract.initialState(
      runtime.createConstructorContext({ studentSk }, COIN_PUBLIC_KEY),
    );

    return new Simulator(module, contract, state, runtime);
  }

  private context(): CircuitContext<StudentPrivateState> {
    return this.runtime.createCircuitContext<StudentPrivateState>(
      this.runtime.dummyContractAddress(),
      COIN_PUBLIC_KEY,
      this.state.currentContractState,
      this.state.currentPrivateState,
    );
  }

  /**
   * Carries ledger and private state forward between calls.
   *
   * `currentContractState` is WASM-backed, so `data` is assigned rather than
   * the object rebuilt: a spread would produce a plain object the runtime
   * rejects on the next call.
   */
  private commit(result: { context: CircuitContext<StudentPrivateState> }): void {
    const next = result.context;
    this.state.currentContractState.data = next.currentQueryContext.state;
    if (next.currentPrivateState !== undefined) {
      this.state.currentPrivateState = next.currentPrivateState;
    }
  }

  /** Publishes a school's key to the local issuer registry. */
  async registerIssuer(schoolIdHash: bigint, issuerPk: JubjubPoint): Promise<void> {
    const result = await this.contract.impureCircuits.registerIssuer(
      this.context(),
      schoolIdHash,
      issuerPk,
    );
    this.commit(result);
  }

  /**
   * Evaluates one predicate.
   *
   * Returns the outcome; throws when the circuit refuses to reason about the
   * credential at all.
   */
  async prove(args: {
    schoolIdHash: bigint;
    subject: bigint;
    slot: number;
    op: bigint;
    operand: bigint;
    credential: bigint[];
    signature: SchnorrSignature;
  }): Promise<boolean> {
    const result = await this.contract.impureCircuits.proveCredentialPredicate(
      this.context(),
      args.schoolIdHash,
      args.subject,
      BigInt(args.slot),
      args.op,
      args.operand,
      args.credential,
      {
        announcement: this.runtime.constructJubjubPoint(
          args.signature.announcement.x,
          args.signature.announcement.y,
        ),
        response: args.signature.response,
      },
    );
    this.commit(result);
    return result.result;
  }

  /** How many predicates this local ledger has recorded. */
  get proofsVerified(): bigint {
    return this.module.ledger(this.state.currentContractState.data).proofsVerified;
  }
}
