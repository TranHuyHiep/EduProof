import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  registerIssuer(context: __compactRuntime.CircuitContext<PS>,
                 issuerKeyHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  proveGpaThreshold(context: __compactRuntime.CircuitContext<PS>,
                    gpaTenths_0: bigint,
                    thresholdTenths_0: bigint): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
  proveActiveStatus(context: __compactRuntime.CircuitContext<PS>,
                    statusCode_0: bigint): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
  proveAcademicYear(context: __compactRuntime.CircuitContext<PS>,
                    year_0: bigint,
                    minimumYear_0: bigint): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
  proveAttributeEquals(context: __compactRuntime.CircuitContext<PS>,
                       attributeHash_0: Uint8Array,
                       expectedHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
  proveScholarshipEligibility(context: __compactRuntime.CircuitContext<PS>,
                              gpaTenths_0: bigint,
                              thresholdTenths_0: bigint,
                              statusCode_0: bigint): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
}

export type ProvableCircuits<PS> = {
  registerIssuer(context: __compactRuntime.CircuitContext<PS>,
                 issuerKeyHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  proveGpaThreshold(context: __compactRuntime.CircuitContext<PS>,
                    gpaTenths_0: bigint,
                    thresholdTenths_0: bigint): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
  proveActiveStatus(context: __compactRuntime.CircuitContext<PS>,
                    statusCode_0: bigint): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
  proveAcademicYear(context: __compactRuntime.CircuitContext<PS>,
                    year_0: bigint,
                    minimumYear_0: bigint): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
  proveAttributeEquals(context: __compactRuntime.CircuitContext<PS>,
                       attributeHash_0: Uint8Array,
                       expectedHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
  proveScholarshipEligibility(context: __compactRuntime.CircuitContext<PS>,
                              gpaTenths_0: bigint,
                              thresholdTenths_0: bigint,
                              statusCode_0: bigint): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  registerIssuer(context: __compactRuntime.CircuitContext<PS>,
                 issuerKeyHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  proveGpaThreshold(context: __compactRuntime.CircuitContext<PS>,
                    gpaTenths_0: bigint,
                    thresholdTenths_0: bigint): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
  proveActiveStatus(context: __compactRuntime.CircuitContext<PS>,
                    statusCode_0: bigint): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
  proveAcademicYear(context: __compactRuntime.CircuitContext<PS>,
                    year_0: bigint,
                    minimumYear_0: bigint): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
  proveAttributeEquals(context: __compactRuntime.CircuitContext<PS>,
                       attributeHash_0: Uint8Array,
                       expectedHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
  proveScholarshipEligibility(context: __compactRuntime.CircuitContext<PS>,
                              gpaTenths_0: bigint,
                              thresholdTenths_0: bigint,
                              statusCode_0: bigint): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
}

export type Ledger = {
  readonly proofsVerified: bigint;
  trustedIssuers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
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
