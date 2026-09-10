import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

export var Operator;
(function (Operator) {
  Operator[Operator['EQ'] = 0] = 'EQ';
  Operator[Operator['NEQ'] = 1] = 'NEQ';
  Operator[Operator['GTE'] = 2] = 'GTE';
  Operator[Operator['GT'] = 3] = 'GT';
  Operator[Operator['LTE'] = 4] = 'LTE';
  Operator[Operator['LT'] = 5] = 'LT';
})(Operator || (Operator = {}));

const _descriptor_0 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_1 = __compactRuntime.CompactTypeField;

const _descriptor_2 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_3 = new __compactRuntime.CompactTypeVector(16, _descriptor_1);

const _descriptor_4 = __compactRuntime.CompactTypeBoolean;

const _descriptor_5 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_6 = new __compactRuntime.CompactTypeBytes(32);

class _Either_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_6.alignment().concat(_descriptor_6.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_4.fromValue(value_0),
      left: _descriptor_6.fromValue(value_0),
      right: _descriptor_6.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.is_left).concat(_descriptor_6.toValue(value_0.left).concat(_descriptor_6.toValue(value_0.right)));
  }
}

const _descriptor_7 = new _Either_0();

const _descriptor_8 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_6.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_6.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_6.toValue(value_0.bytes);
  }
}

const _descriptor_9 = new _ContractAddress_0();

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
    if (typeof(witnesses_0.studentSecretKey) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named studentSecretKey');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      subjectCommitment(context, ...args_1) {
        return { result: pureCircuits.subjectCommitment(...args_1), context };
      },
      proveCredentialPredicate: (...args_1) => {
        if (args_1.length !== 7) {
          throw new __compactRuntime.CompactError(`proveCredentialPredicate: expected 7 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const schoolIdHash_0 = args_1[1];
        const subject_0 = args_1[2];
        const slot_0 = args_1[3];
        const op_0 = args_1[4];
        const operand_0 = args_1[5];
        const credential_0 = args_1[6];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 1 (as invoked from Typescript)',
                                     'eduproof.compact line 155 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(schoolIdHash_0) === 'bigint' && schoolIdHash_0 >= 0 && schoolIdHash_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'eduproof.compact line 155 char 1',
                                     'Field',
                                     schoolIdHash_0)
        }
        if (!(typeof(subject_0) === 'bigint' && subject_0 >= 0 && subject_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'eduproof.compact line 155 char 1',
                                     'Field',
                                     subject_0)
        }
        if (!(typeof(slot_0) === 'bigint' && slot_0 >= 0n && slot_0 <= 255n)) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'eduproof.compact line 155 char 1',
                                     'Uint<0..256>',
                                     slot_0)
        }
        if (!(typeof(op_0) === 'bigint' && op_0 >= 0n && op_0 <= 255n)) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'eduproof.compact line 155 char 1',
                                     'Uint<0..256>',
                                     op_0)
        }
        if (!(typeof(operand_0) === 'bigint' && operand_0 >= 0 && operand_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'eduproof.compact line 155 char 1',
                                     'Field',
                                     operand_0)
        }
        if (!(Array.isArray(credential_0) && credential_0.length === 16 && credential_0.every((t) => typeof(t) === 'bigint' && t >= 0 && t <= __compactRuntime.MAX_FIELD))) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'eduproof.compact line 155 char 1',
                                     'Vector<16, Field>',
                                     credential_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(schoolIdHash_0).concat(_descriptor_1.toValue(subject_0).concat(_descriptor_2.toValue(slot_0).concat(_descriptor_2.toValue(op_0).concat(_descriptor_1.toValue(operand_0).concat(_descriptor_3.toValue(credential_0)))))),
            alignment: _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_1.alignment().concat(_descriptor_3.alignment())))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._proveCredentialPredicate_0(context,
                                                          partialProofData,
                                                          schoolIdHash_0,
                                                          subject_0,
                                                          slot_0,
                                                          op_0,
                                                          operand_0,
                                                          credential_0);
        partialProofData.output = { value: _descriptor_4.toValue(result_0), alignment: _descriptor_4.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      proveCredentialPredicate: this.circuits.proveCredentialPredicate
    };
    this.provableCircuits = {
      proveCredentialPredicate: this.circuits.proveCredentialPredicate
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
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
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('proveCredentialPredicate', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
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
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(0n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _transientHash_0(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_1, value_0);
    return result_0;
  }
  _studentSecretKey_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.studentSecretKey(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0 && result_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('studentSecretKey',
                                 'return value',
                                 'eduproof.compact line 92 char 1',
                                 'Field',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_1.toValue(result_0),
      alignment: _descriptor_1.alignment()
    });
    return result_0;
  }
  _subjectCommitment_0(sk_0) { return this._transientHash_0(sk_0); }
  _selectSlot_0(v_0, slot_0) {
    const terms_0 = this._mapper_0(((i_0) =>
                                    {
                                      if (this._equal_0(i_0, slot_0)) {
                                        return v_0[i_0];
                                      } else {
                                        return 0n;
                                      }
                                    }),
                                   [0n,
                                    1n,
                                    2n,
                                    3n,
                                    4n,
                                    5n,
                                    6n,
                                    7n,
                                    8n,
                                    9n,
                                    10n,
                                    11n,
                                    12n,
                                    13n,
                                    14n,
                                    15n]);
    return this._folder_0(((a_0, b_0) =>
                           {
                             return __compactRuntime.addField(a_0, b_0);
                           }),
                          0n,
                          terms_0);
  }
  _compare_0(actual_0, op_0, operand_0) {
    const a_0 = ((t1) => {
                  if (t1 > 18446744073709551615n) {
                    throw new __compactRuntime.CompactError('eduproof.compact line 131 char 13: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                  }
                  return t1;
                })(actual_0);
    const b_0 = ((t1) => {
                  if (t1 > 18446744073709551615n) {
                    throw new __compactRuntime.CompactError('eduproof.compact line 132 char 13: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                  }
                  return t1;
                })(operand_0);
    if (this._equal_1(op_0, BigInt(0))) {
      return actual_0 === operand_0;
    } else {
      if (this._equal_2(op_0, BigInt(1))) {
        return !(actual_0 === operand_0);
      } else {
        if (this._equal_3(op_0, BigInt(2))) {
          return a_0 >= b_0;
        } else {
          if (this._equal_4(op_0, BigInt(3))) {
            return a_0 > b_0;
          } else {
            if (this._equal_5(op_0, BigInt(4))) {
              return a_0 <= b_0;
            } else {
              return this._equal_6(op_0, BigInt(5)) && a_0 < b_0;
            }
          }
        }
      }
    }
  }
  _proveCredentialPredicate_0(context,
                              partialProofData,
                              schoolIdHash_0,
                              subject_0,
                              slot_0,
                              op_0,
                              operand_0,
                              credential_0)
  {
    __compactRuntime.assert(this._subjectCommitment_0(this._studentSecretKey_0(context,
                                                                               partialProofData))
                            ===
                            subject_0,
                            'not the credential holder');
    __compactRuntime.assert(this._selectSlot_0(credential_0, 1n) === subject_0,
                            'subject mismatch');
    __compactRuntime.assert(this._selectSlot_0(credential_0, 0n)
                            ===
                            schoolIdHash_0,
                            'issuer mismatch');
    const tmp_0 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(0n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_0.toValue(tmp_0),
                                                                alignment: _descriptor_0.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return this._compare_0(this._selectSlot_0(credential_0, slot_0),
                           op_0,
                           operand_0);
  }
  _equal_0(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _mapper_0(f, a0) {
    let a = [];
    for (let i = 0; i < 16; i++) { a[i] = f(a0[i]); }
    return a;
  }
  _folder_0(f, x, a0) {
    for (let i = 0; i < 16; i++) { x = f(x, a0[i]); }
    return x;
  }
  _equal_1(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_3(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_4(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_5(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_6(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
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
      return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_2.toValue(0n),
                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({
  studentSecretKey: (...args) => undefined
});
export const pureCircuits = {
  subjectCommitment: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`subjectCommitment: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const sk_0 = args_0[0];
    if (!(typeof(sk_0) === 'bigint' && sk_0 >= 0 && sk_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('subjectCommitment',
                                 'argument 1',
                                 'eduproof.compact line 101 char 1',
                                 'Field',
                                 sk_0)
    }
    return _dummyContract._subjectCommitment_0(sk_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
