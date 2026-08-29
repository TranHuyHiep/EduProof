import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum Operator { EQ = 0, NEQ = 1, GTE = 2, GT = 3, LTE = 4, LT = 5 }

export type Witnesses<PS> = {
  studentSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
}

export type ImpureCircuits<PS> = {
  registerIssuer(context: __compactRuntime.CircuitContext<PS>,
                 schoolIdHash_0: bigint,
                 issuerPk_0: __compactRuntime.JubjubPoint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  proveCredentialPredicate(context: __compactRuntime.CircuitContext<PS>,
                           schoolIdHash_0: bigint,
                           subject_0: bigint,
                           slot_0: bigint,
                           op_0: bigint,
                           operand_0: bigint,
                           credential_0: bigint[],
                           signature_0: { announcement: __compactRuntime.JubjubPoint,
                                          response: bigint
                                        }): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
}

export type ProvableCircuits<PS> = {
  registerIssuer(context: __compactRuntime.CircuitContext<PS>,
                 schoolIdHash_0: bigint,
                 issuerPk_0: __compactRuntime.JubjubPoint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  proveCredentialPredicate(context: __compactRuntime.CircuitContext<PS>,
                           schoolIdHash_0: bigint,
                           subject_0: bigint,
                           slot_0: bigint,
                           op_0: bigint,
                           operand_0: bigint,
                           credential_0: bigint[],
                           signature_0: { announcement: __compactRuntime.JubjubPoint,
                                          response: bigint
                                        }): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
}

export type PureCircuits = {
  subjectCommitment(sk_0: bigint): bigint;
}

export type Circuits<PS> = {
  registerIssuer(context: __compactRuntime.CircuitContext<PS>,
                 schoolIdHash_0: bigint,
                 issuerPk_0: __compactRuntime.JubjubPoint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  subjectCommitment(context: __compactRuntime.CircuitContext<PS>, sk_0: bigint): Promise<__compactRuntime.CircuitResults<PS, bigint>>;
  proveCredentialPredicate(context: __compactRuntime.CircuitContext<PS>,
                           schoolIdHash_0: bigint,
                           subject_0: bigint,
                           slot_0: bigint,
                           op_0: bigint,
                           operand_0: bigint,
                           credential_0: bigint[],
                           signature_0: { announcement: __compactRuntime.JubjubPoint,
                                          response: bigint
                                        }): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
}

export type Ledger = {
  issuers: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): __compactRuntime.JubjubPoint;
    [Symbol.iterator](): Iterator<[bigint, __compactRuntime.JubjubPoint]>
  };
  readonly proofsVerified: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): Promise<__compactRuntime.ConstructorResult<PS>>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
export declare const expectedVk: Record<string, string>;
