import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.19.0');

export var Operator;
(function (Operator) {
  Operator[Operator['EQ'] = 0] = 'EQ';
  Operator[Operator['NEQ'] = 1] = 'NEQ';
  Operator[Operator['GTE'] = 2] = 'GTE';
  Operator[Operator['GT'] = 3] = 'GT';
  Operator[Operator['LTE'] = 4] = 'LTE';
  Operator[Operator['LT'] = 5] = 'LT';
})(Operator || (Operator = {}));

const _descriptor_0 = __compactRuntime.CompactTypeField;

const _descriptor_1 = __compactRuntime.CompactTypeJubjubPoint;

const _descriptor_2 = __compactRuntime.CompactTypeBoolean;

const _descriptor_3 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_4 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_5 = new __compactRuntime.CompactTypeVector(16, _descriptor_0);

class _JubjubSchnorrSignature_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_0.alignment());
  }
  fromValue(value_0) {
    return {
      announcement: _descriptor_1.fromValue(value_0),
      response: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.announcement).concat(_descriptor_0.toValue(value_0.response));
  }
}

const _descriptor_6 = new _JubjubSchnorrSignature_0();

const _descriptor_7 = __compactRuntime.CompactTypeField;

class _JubjubSchnorrHashInput_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_5.alignment()))));
  }
  fromValue(value_0) {
    return {
      annX: _descriptor_0.fromValue(value_0),
      annY: _descriptor_0.fromValue(value_0),
      pkX: _descriptor_0.fromValue(value_0),
      pkY: _descriptor_0.fromValue(value_0),
      msg: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.annX).concat(_descriptor_0.toValue(value_0.annY).concat(_descriptor_0.toValue(value_0.pkX).concat(_descriptor_0.toValue(value_0.pkY).concat(_descriptor_5.toValue(value_0.msg)))));
  }
}

const _descriptor_8 = new _JubjubSchnorrHashInput_0();

const _descriptor_9 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_10 = new __compactRuntime.CompactTypeBytes(32);

class _Either_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_10.alignment().concat(_descriptor_10.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_2.fromValue(value_0),
      left: _descriptor_10.fromValue(value_0),
      right: _descriptor_10.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.is_left).concat(_descriptor_10.toValue(value_0.left).concat(_descriptor_10.toValue(value_0.right)));
  }
}

const _descriptor_11 = new _Either_0();

const _descriptor_12 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_10.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_10.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_10.toValue(value_0.bytes);
  }
}

const _descriptor_13 = new _ContractAddress_0();

const _descriptor_14 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

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
      registerIssuer: async (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`registerIssuer: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const schoolIdHash_0 = args_1[1];
        const issuerPk_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('registerIssuer',
                                     'argument 1 (as invoked from Typescript)',
                                     'eduproof.compact line 82 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(schoolIdHash_0) === 'bigint' && schoolIdHash_0 >= 0 && schoolIdHash_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('registerIssuer',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'eduproof.compact line 82 char 1',
                                     'Field',
                                     schoolIdHash_0)
        }
        if (!(typeof(issuerPk_0.x) === 'bigint' && typeof(issuerPk_0.y) === 'bigint')) {
          __compactRuntime.typeError('registerIssuer',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'eduproof.compact line 82 char 1',
                                     'JubjubPoint',
                                     issuerPk_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(schoolIdHash_0).concat(_descriptor_1.toValue(issuerPk_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_1.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._registerIssuer_0(context,
                                                      partialProofData,
                                                      schoolIdHash_0,
                                                      issuerPk_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      async subjectCommitment(context, ...args_1) {
        return { result: pureCircuits.subjectCommitment(...args_1), context };
      },
      proveCredentialPredicate: async (...args_1) => {
        if (args_1.length !== 8) {
          throw new __compactRuntime.CompactError(`proveCredentialPredicate: expected 8 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const schoolIdHash_0 = args_1[1];
        const subject_0 = args_1[2];
        const slot_0 = args_1[3];
        const op_0 = args_1[4];
        const operand_0 = args_1[5];
        const credential_0 = args_1[6];
        const signature_0 = args_1[7];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 1 (as invoked from Typescript)',
                                     'eduproof.compact line 144 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(schoolIdHash_0) === 'bigint' && schoolIdHash_0 >= 0 && schoolIdHash_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'eduproof.compact line 144 char 1',
                                     'Field',
                                     schoolIdHash_0)
        }
        if (!(typeof(subject_0) === 'bigint' && subject_0 >= 0 && subject_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'eduproof.compact line 144 char 1',
                                     'Field',
                                     subject_0)
        }
        if (!(typeof(slot_0) === 'bigint' && slot_0 >= 0n && slot_0 <= 255n)) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'eduproof.compact line 144 char 1',
                                     'Uint<0..256>',
                                     slot_0)
        }
        if (!(typeof(op_0) === 'bigint' && op_0 >= 0n && op_0 <= 255n)) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'eduproof.compact line 144 char 1',
                                     'Uint<0..256>',
                                     op_0)
        }
        if (!(typeof(operand_0) === 'bigint' && operand_0 >= 0 && operand_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'eduproof.compact line 144 char 1',
                                     'Field',
                                     operand_0)
        }
        if (!(Array.isArray(credential_0) && credential_0.length === 16 && credential_0.every((t) => typeof(t) === 'bigint' && t >= 0 && t <= __compactRuntime.MAX_FIELD))) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'eduproof.compact line 144 char 1',
                                     'Vector<16, Field>',
                                     credential_0)
        }
        if (!(typeof(signature_0) === 'object' && typeof(signature_0.announcement.x) === 'bigint' && typeof(signature_0.announcement.y) === 'bigint' && typeof(signature_0.response) === 'bigint' && signature_0.response >= 0 && signature_0.response <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 7 (argument 8 as invoked from Typescript)',
                                     'eduproof.compact line 144 char 1',
                                     'struct JubjubSchnorrSignature<announcement: JubjubPoint, response: Field>',
                                     signature_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(schoolIdHash_0).concat(_descriptor_0.toValue(subject_0).concat(_descriptor_4.toValue(slot_0).concat(_descriptor_4.toValue(op_0).concat(_descriptor_0.toValue(operand_0).concat(_descriptor_5.toValue(credential_0).concat(_descriptor_6.toValue(signature_0))))))),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_5.alignment().concat(_descriptor_6.alignment()))))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._proveCredentialPredicate_0(context,
                                                                partialProofData,
                                                                schoolIdHash_0,
                                                                subject_0,
                                                                slot_0,
                                                                op_0,
                                                                operand_0,
                                                                credential_0,
                                                                signature_0);
        partialProofData.output = { value: _descriptor_2.toValue(result_0), alignment: _descriptor_2.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      }
    };
    this.impureCircuits = {
      registerIssuer: this.circuits.registerIssuer,
      proveCredentialPredicate: this.circuits.proveCredentialPredicate
    };
    this.provableCircuits = {
      registerIssuer: this.circuits.registerIssuer,
      proveCredentialPredicate: this.circuits.proveCredentialPredicate
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
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('registerIssuer', new __compactRuntime.ContractOperation());
    state_0.setOperation('proveCredentialPredicate', new __compactRuntime.ContractOperation());
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
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(1n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_9.toValue(0n),
                                                                                              alignment: _descriptor_9.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.callContext.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.callContext.currentPrivateState,
      currentZswapLocalState: context.callContext.currentZswapLocalState
    }
  }
  _jubjubSchnorrVerify_0(msg_0, signature_0, pk_0) {
    const __compact_pattern_tmp1_0 = signature_0;
    const announcement_0 = __compact_pattern_tmp1_0.announcement;
    const response_0 = __compact_pattern_tmp1_0.response;
    const cNative_0 = this._transientHash_1({ annX:
                                                this._jubjubPointX_0(announcement_0),
                                              annY:
                                                this._jubjubPointY_0(announcement_0),
                                              pkX: this._jubjubPointX_0(pk_0),
                                              pkY: this._jubjubPointY_0(pk_0),
                                              msg: msg_0 });
    const c_0 = cNative_0;
    const lhs_0 = this._ecMulGenerator_0(response_0);
    const rhs_0 = this._ecAdd_0(announcement_0, this._ecMul_0(pk_0, c_0));
    return this._equal_0(lhs_0, rhs_0);
  }
  _transientHash_0(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_0, value_0);
    return result_0;
  }
  _transientHash_1(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_8, value_0);
    return result_0;
  }
  _jubjubPointX_0(pt_0) {
    const result_0 = __compactRuntime.jubjubPointX(pt_0);
    return result_0;
  }
  _jubjubPointY_0(pt_0) {
    const result_0 = __compactRuntime.jubjubPointY(pt_0);
    return result_0;
  }
  _ecAdd_0(a_0, b_0) {
    const result_0 = __compactRuntime.ecAdd(a_0, b_0);
    return result_0;
  }
  _ecMul_0(a_0, b_0) {
    const result_0 = __compactRuntime.ecMul(a_0, b_0);
    return result_0;
  }
  _ecMulGenerator_0(b_0) {
    const result_0 = __compactRuntime.ecMulGenerator(b_0);
    return result_0;
  }
  _studentSecretKey_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.callContext.currentQueryContext.state), context.callContext.currentPrivateState, context.callContext.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.studentSecretKey(witnessContext_0);
    context.callContext.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0 && result_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('studentSecretKey',
                                 'return value',
                                 'eduproof.compact line 73 char 1',
                                 'Field',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  async _registerIssuer_0(context, partialProofData, schoolIdHash_0, issuerPk_0)
  {
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(0n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(schoolIdHash_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(issuerPk_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _selectSlot_0(v_0, slot_0) {
    const terms_0 = this._mapper_0(((i_0) =>
                                    {
                                      if (i_0 === slot_0) {
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
                    throw new __compactRuntime.CompactError('eduproof.compact line 112 char 13: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                  }
                  return t1;
                })(actual_0);
    const b_0 = ((t1) => {
                  if (t1 > 18446744073709551615n) {
                    throw new __compactRuntime.CompactError('eduproof.compact line 113 char 13: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                  }
                  return t1;
                })(operand_0);
    if (op_0 === BigInt(0)) {
      return actual_0 === operand_0;
    } else {
      if (op_0 === BigInt(1)) {
        return !(actual_0 === operand_0);
      } else {
        if (op_0 === BigInt(2)) {
          return a_0 >= b_0;
        } else {
          if (op_0 === BigInt(3)) {
            return a_0 > b_0;
          } else {
            if (op_0 === BigInt(4)) {
              return a_0 <= b_0;
            } else {
              return op_0 === BigInt(5) && a_0 < b_0;
            }
          }
        }
      }
    }
  }
  _subjectCommitment_0(sk_0) { return this._transientHash_0(sk_0); }
  async _proveCredentialPredicate_0(context,
                                    partialProofData,
                                    schoolIdHash_0,
                                    subject_0,
                                    slot_0,
                                    op_0,
                                    operand_0,
                                    credential_0,
                                    signature_0)
  {
    __compactRuntime.assert(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(0n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(schoolIdHash_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'unknown issuer');
    const issuerPk_0 = _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 0 } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_4.toValue(0n),
                                                                                                             alignment: _descriptor_4.alignment() } }] } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_0.toValue(schoolIdHash_0),
                                                                                                             alignment: _descriptor_0.alignment() } }] } },
                                                                                  { popeq: { cached: false,
                                                                                             result: undefined } }]).value);
    __compactRuntime.assert(this._jubjubSchnorrVerify_0(credential_0,
                                                        signature_0,
                                                        issuerPk_0),
                            'bad issuer signature');
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
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_3.toValue(tmp_0),
                                                                alignment: _descriptor_3.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return this._compare_0(this._selectSlot_0(credential_0, slot_0),
                           op_0,
                           operand_0);
  }
  _equal_0(x0, y0) {
    if (x0.x != y0.x || x0.y != y0.y) {
      return false;
    }
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
    issuers: {
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
                                                                                            value: { value: _descriptor_4.toValue(0n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_9.toValue(0n),
                                                                                                                                 alignment: _descriptor_9.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_9.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(0n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0 && key_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'eduproof.compact line 60 char 1',
                                     'Field',
                                     key_0)
        }
        return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(0n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0 && key_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'eduproof.compact line 60 char 1',
                                     'Field',
                                     key_0)
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(0n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[0];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_1.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    get proofsVerified() {
      return _descriptor_9.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(1n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    }
  };
}
const _emptyContext = {
  callContext: { currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress()), currentGasCost: __compactRuntime.emptyRunningCost() }
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
                                 'eduproof.compact line 131 char 1',
                                 'Field',
                                 sk_0)
    }
    return _dummyContract._subjectCommitment_0(sk_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
export const expectedVk = {
  'proveCredentialPredicate': '3ff88503c5b659e301542250ab1f78e64728b3a61be6544343b7400ecb59e615',
  'registerIssuer': 'e3b0284c83b63d00174de2701a5417a23dba6061bdcca7c9485e2487fae0d69c',
};

//# sourceMappingURL=index.js.map
