import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.19.0');

const _descriptor_0 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_1 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_2 = __compactRuntime.CompactTypeBoolean;

const _descriptor_3 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_4 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

class _Either_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_2.fromValue(value_0),
      left: _descriptor_1.fromValue(value_0),
      right: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.is_left).concat(_descriptor_1.toValue(value_0.left).concat(_descriptor_1.toValue(value_0.right)));
  }
}

const _descriptor_5 = new _Either_0();

const _descriptor_6 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_1.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.bytes);
  }
}

const _descriptor_7 = new _ContractAddress_0();

const _descriptor_8 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      registerIssuer: async (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`registerIssuer: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const issuerKeyHash_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('registerIssuer',
                                     'argument 1 (as invoked from Typescript)',
                                     'eduproof.compact line 26 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(issuerKeyHash_0.buffer instanceof ArrayBuffer && issuerKeyHash_0.BYTES_PER_ELEMENT === 1 && issuerKeyHash_0.length === 32)) {
          __compactRuntime.typeError('registerIssuer',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'eduproof.compact line 26 char 1',
                                     'Bytes<32>',
                                     issuerKeyHash_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(issuerKeyHash_0),
            alignment: _descriptor_1.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._registerIssuer_0(context,
                                                      partialProofData,
                                                      issuerKeyHash_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      proveGpaThreshold: async (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`proveGpaThreshold: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const gpaTenths_0 = args_1[1];
        const thresholdTenths_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('proveGpaThreshold',
                                     'argument 1 (as invoked from Typescript)',
                                     'eduproof.compact line 35 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(gpaTenths_0) === 'bigint' && gpaTenths_0 >= 0n && gpaTenths_0 <= 65535n)) {
          __compactRuntime.typeError('proveGpaThreshold',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'eduproof.compact line 35 char 1',
                                     'Uint<0..65536>',
                                     gpaTenths_0)
        }
        if (!(typeof(thresholdTenths_0) === 'bigint' && thresholdTenths_0 >= 0n && thresholdTenths_0 <= 65535n)) {
          __compactRuntime.typeError('proveGpaThreshold',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'eduproof.compact line 35 char 1',
                                     'Uint<0..65536>',
                                     thresholdTenths_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(gpaTenths_0).concat(_descriptor_0.toValue(thresholdTenths_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._proveGpaThreshold_0(context,
                                                         partialProofData,
                                                         gpaTenths_0,
                                                         thresholdTenths_0);
        partialProofData.output = { value: _descriptor_2.toValue(result_0), alignment: _descriptor_2.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      proveActiveStatus: async (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`proveActiveStatus: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const statusCode_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('proveActiveStatus',
                                     'argument 1 (as invoked from Typescript)',
                                     'eduproof.compact line 45 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(statusCode_0) === 'bigint' && statusCode_0 >= 0n && statusCode_0 <= 255n)) {
          __compactRuntime.typeError('proveActiveStatus',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'eduproof.compact line 45 char 1',
                                     'Uint<0..256>',
                                     statusCode_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_3.toValue(statusCode_0),
            alignment: _descriptor_3.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._proveActiveStatus_0(context,
                                                         partialProofData,
                                                         statusCode_0);
        partialProofData.output = { value: _descriptor_2.toValue(result_0), alignment: _descriptor_2.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      proveAcademicYear: async (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`proveAcademicYear: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const year_0 = args_1[1];
        const minimumYear_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('proveAcademicYear',
                                     'argument 1 (as invoked from Typescript)',
                                     'eduproof.compact line 51 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(year_0) === 'bigint' && year_0 >= 0n && year_0 <= 255n)) {
          __compactRuntime.typeError('proveAcademicYear',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'eduproof.compact line 51 char 1',
                                     'Uint<0..256>',
                                     year_0)
        }
        if (!(typeof(minimumYear_0) === 'bigint' && minimumYear_0 >= 0n && minimumYear_0 <= 255n)) {
          __compactRuntime.typeError('proveAcademicYear',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'eduproof.compact line 51 char 1',
                                     'Uint<0..256>',
                                     minimumYear_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_3.toValue(year_0).concat(_descriptor_3.toValue(minimumYear_0)),
            alignment: _descriptor_3.alignment().concat(_descriptor_3.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._proveAcademicYear_0(context,
                                                         partialProofData,
                                                         year_0,
                                                         minimumYear_0);
        partialProofData.output = { value: _descriptor_2.toValue(result_0), alignment: _descriptor_2.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      proveAttributeEquals: async (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`proveAttributeEquals: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const attributeHash_0 = args_1[1];
        const expectedHash_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('proveAttributeEquals',
                                     'argument 1 (as invoked from Typescript)',
                                     'eduproof.compact line 63 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(attributeHash_0.buffer instanceof ArrayBuffer && attributeHash_0.BYTES_PER_ELEMENT === 1 && attributeHash_0.length === 32)) {
          __compactRuntime.typeError('proveAttributeEquals',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'eduproof.compact line 63 char 1',
                                     'Bytes<32>',
                                     attributeHash_0)
        }
        if (!(expectedHash_0.buffer instanceof ArrayBuffer && expectedHash_0.BYTES_PER_ELEMENT === 1 && expectedHash_0.length === 32)) {
          __compactRuntime.typeError('proveAttributeEquals',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'eduproof.compact line 63 char 1',
                                     'Bytes<32>',
                                     expectedHash_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(attributeHash_0).concat(_descriptor_1.toValue(expectedHash_0)),
            alignment: _descriptor_1.alignment().concat(_descriptor_1.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._proveAttributeEquals_0(context,
                                                            partialProofData,
                                                            attributeHash_0,
                                                            expectedHash_0);
        partialProofData.output = { value: _descriptor_2.toValue(result_0), alignment: _descriptor_2.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      proveScholarshipEligibility: async (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`proveScholarshipEligibility: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const gpaTenths_0 = args_1[1];
        const thresholdTenths_0 = args_1[2];
        const statusCode_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('proveScholarshipEligibility',
                                     'argument 1 (as invoked from Typescript)',
                                     'eduproof.compact line 72 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(gpaTenths_0) === 'bigint' && gpaTenths_0 >= 0n && gpaTenths_0 <= 65535n)) {
          __compactRuntime.typeError('proveScholarshipEligibility',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'eduproof.compact line 72 char 1',
                                     'Uint<0..65536>',
                                     gpaTenths_0)
        }
        if (!(typeof(thresholdTenths_0) === 'bigint' && thresholdTenths_0 >= 0n && thresholdTenths_0 <= 65535n)) {
          __compactRuntime.typeError('proveScholarshipEligibility',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'eduproof.compact line 72 char 1',
                                     'Uint<0..65536>',
                                     thresholdTenths_0)
        }
        if (!(typeof(statusCode_0) === 'bigint' && statusCode_0 >= 0n && statusCode_0 <= 255n)) {
          __compactRuntime.typeError('proveScholarshipEligibility',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'eduproof.compact line 72 char 1',
                                     'Uint<0..256>',
                                     statusCode_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(gpaTenths_0).concat(_descriptor_0.toValue(thresholdTenths_0).concat(_descriptor_3.toValue(statusCode_0))),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._proveScholarshipEligibility_0(context,
                                                                   partialProofData,
                                                                   gpaTenths_0,
                                                                   thresholdTenths_0,
                                                                   statusCode_0);
        partialProofData.output = { value: _descriptor_2.toValue(result_0), alignment: _descriptor_2.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      }
    };
    this.impureCircuits = {
      registerIssuer: this.circuits.registerIssuer,
      proveGpaThreshold: this.circuits.proveGpaThreshold,
      proveActiveStatus: this.circuits.proveActiveStatus,
      proveAcademicYear: this.circuits.proveAcademicYear,
      proveAttributeEquals: this.circuits.proveAttributeEquals,
      proveScholarshipEligibility: this.circuits.proveScholarshipEligibility
    };
    this.provableCircuits = {
      registerIssuer: this.circuits.registerIssuer,
      proveGpaThreshold: this.circuits.proveGpaThreshold,
      proveActiveStatus: this.circuits.proveActiveStatus,
      proveAcademicYear: this.circuits.proveAcademicYear,
      proveAttributeEquals: this.circuits.proveAttributeEquals,
      proveScholarshipEligibility: this.circuits.proveScholarshipEligibility
    };
  }
  async initialState(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('registerIssuer', new __compactRuntime.ContractOperation());
    state_0.setOperation('proveGpaThreshold', new __compactRuntime.ContractOperation());
    state_0.setOperation('proveActiveStatus', new __compactRuntime.ContractOperation());
    state_0.setOperation('proveAcademicYear', new __compactRuntime.ContractOperation());
    state_0.setOperation('proveAttributeEquals', new __compactRuntime.ContractOperation());
    state_0.setOperation('proveScholarshipEligibility', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext('constructor', __compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(1n),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.callContext.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.callContext.currentPrivateState,
      currentZswapLocalState: context.callContext.currentZswapLocalState
    }
  }
  async _registerIssuer_0(context, partialProofData, issuerKeyHash_0) {
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_3.toValue(1n),
                                                                  alignment: _descriptor_3.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(issuerKeyHash_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  async _proveGpaThreshold_0(context,
                             partialProofData,
                             gpaTenths_0,
                             thresholdTenths_0)
  {
    const tmp_0 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_3.toValue(0n),
                                                                  alignment: _descriptor_3.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_0.toValue(tmp_0),
                                                                alignment: _descriptor_0.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return gpaTenths_0 >= thresholdTenths_0;
  }
  async _proveActiveStatus_0(context, partialProofData, statusCode_0) {
    const tmp_0 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_3.toValue(0n),
                                                                  alignment: _descriptor_3.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_0.toValue(tmp_0),
                                                                alignment: _descriptor_0.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return statusCode_0 === 0n;
  }
  async _proveAcademicYear_0(context, partialProofData, year_0, minimumYear_0) {
    const tmp_0 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_3.toValue(0n),
                                                                  alignment: _descriptor_3.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_0.toValue(tmp_0),
                                                                alignment: _descriptor_0.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return year_0 >= minimumYear_0;
  }
  async _proveAttributeEquals_0(context,
                                partialProofData,
                                attributeHash_0,
                                expectedHash_0)
  {
    const tmp_0 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_3.toValue(0n),
                                                                  alignment: _descriptor_3.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_0.toValue(tmp_0),
                                                                alignment: _descriptor_0.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return this._equal_0(attributeHash_0, expectedHash_0);
  }
  async _proveScholarshipEligibility_0(context,
                                       partialProofData,
                                       gpaTenths_0,
                                       thresholdTenths_0,
                                       statusCode_0)
  {
    const tmp_0 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_3.toValue(0n),
                                                                  alignment: _descriptor_3.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_0.toValue(tmp_0),
                                                                alignment: _descriptor_0.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return gpaTenths_0 >= thresholdTenths_0 && statusCode_0 === 0n;
  }
  _equal_0(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    callContext: { currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()), currentGasCost: __compactRuntime.emptyRunningCost() },
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    get proofsVerified() {
      return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_3.toValue(0n),
                                                                                                   alignment: _descriptor_3.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    },
    trustedIssuers: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_3.toValue(1n),
                                                                                                     alignment: _descriptor_3.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                                                                 alignment: _descriptor_4.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_3.toValue(1n),
                                                                                                     alignment: _descriptor_3.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(elem_0.buffer instanceof ArrayBuffer && elem_0.BYTES_PER_ELEMENT === 1 && elem_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'eduproof.compact line 23 char 1',
                                     'Bytes<32>',
                                     elem_0)
        }
        return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_3.toValue(1n),
                                                                                                     alignment: _descriptor_3.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(elem_0),
                                                                                                                                 alignment: _descriptor_1.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1];
        return self_0.asMap().keys().map((elem) => _descriptor_1.fromValue(elem.value))[Symbol.iterator]();
      }
    }
  };
}
const _emptyContext = {
  callContext: { currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress()), currentGasCost: __compactRuntime.emptyRunningCost() }
};
const _dummyContract = new Contract({ });
export const pureCircuits = {};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
export const expectedVk = {
  'proveAcademicYear': 'b5b665530d4a59f3771d3f71f921fe553b65c51d095a7a822eb0f31fa73b00e3',
  'proveActiveStatus': 'a925f2dc9c95824ce378222576c7a5126b0d4c498d4e039362a52524fbb34387',
  'proveAttributeEquals': '5080e6476aa1048c9627dfdae8cc597f1cb4345d188a8b5c7e3b14dcd2ceef23',
  'proveGpaThreshold': 'e00145178299964d72d810f7352714213fe357477e092135865b07b2f49bf6ae',
  'proveScholarshipEligibility': 'd7a9fddcd722cfa623466fb2083ddd5bbe392104277b0774158d9e6f025f27f3',
  'registerIssuer': '04e20ba0bb1626574bfd66579f58b96840d0fa50ba9d090eedbe8dd845ae915b',
};

//# sourceMappingURL=index.js.map
