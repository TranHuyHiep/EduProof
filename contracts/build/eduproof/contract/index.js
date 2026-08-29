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

const _descriptor_0 = __compactRuntime.CompactTypeField;

const _descriptor_1 = __compactRuntime.CompactTypeJubjubPoint;

const _descriptor_2 = __compactRuntime.CompactTypeBoolean;

const _descriptor_3 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_4 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_5 = new __compactRuntime.CompactTypeVector(16, _descriptor_0);

class _SchnorrSignature_0 {
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

const _descriptor_6 = new _SchnorrSignature_0();

const _descriptor_7 = new __compactRuntime.CompactTypeUnsignedInteger(127n, 1);

const _descriptor_8 = new __compactRuntime.CompactTypeUnsignedInteger(452312848583266388373324160190187140051835877600158453279131187530910662655n, 31);

class _tuple_0 {
  alignment() {
    return _descriptor_7.alignment().concat(_descriptor_8.alignment());
  }
  fromValue(value_0) {
    return [
      _descriptor_7.fromValue(value_0),
      _descriptor_8.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_7.toValue(value_0[0]).concat(_descriptor_8.toValue(value_0[1]));
  }
}

const _descriptor_9 = new _tuple_0();

class _SchnorrHashInput_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_5.alignment()))));
  }
  fromValue(value_0) {
    return {
      ann_x: _descriptor_0.fromValue(value_0),
      ann_y: _descriptor_0.fromValue(value_0),
      pk_x: _descriptor_0.fromValue(value_0),
      pk_y: _descriptor_0.fromValue(value_0),
      msg: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.ann_x).concat(_descriptor_0.toValue(value_0.ann_y).concat(_descriptor_0.toValue(value_0.pk_x).concat(_descriptor_0.toValue(value_0.pk_y).concat(_descriptor_5.toValue(value_0.msg)))));
  }
}

const _descriptor_10 = new _SchnorrHashInput_0();

const _descriptor_11 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_12 = new __compactRuntime.CompactTypeBytes(32);

class _Either_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_12.alignment().concat(_descriptor_12.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_2.fromValue(value_0),
      left: _descriptor_12.fromValue(value_0),
      right: _descriptor_12.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.is_left).concat(_descriptor_12.toValue(value_0.left).concat(_descriptor_12.toValue(value_0.right)));
  }
}

const _descriptor_13 = new _Either_0();

const _descriptor_14 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_12.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_12.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_12.toValue(value_0.bytes);
  }
}

const _descriptor_15 = new _ContractAddress_0();

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
    if (typeof(witnesses_0.getSchnorrReduction) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getSchnorrReduction');
    }
    if (typeof(witnesses_0.studentSecretKey) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named studentSecretKey');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      registerIssuer: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`registerIssuer: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const schoolIdHash_0 = args_1[1];
        const issuerPk_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('registerIssuer',
                                     'argument 1 (as invoked from Typescript)',
                                     'eduproof.compact line 83 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(schoolIdHash_0) === 'bigint' && schoolIdHash_0 >= 0 && schoolIdHash_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('registerIssuer',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'eduproof.compact line 83 char 1',
                                     'Field',
                                     schoolIdHash_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(schoolIdHash_0).concat(_descriptor_1.toValue(issuerPk_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_1.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._registerIssuer_0(context,
                                                partialProofData,
                                                schoolIdHash_0,
                                                issuerPk_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      subjectCommitment(context, ...args_1) {
        return { result: pureCircuits.subjectCommitment(...args_1), context };
      },
      proveCredentialPredicate: (...args_1) => {
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
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 1 (as invoked from Typescript)',
                                     'eduproof.compact line 145 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(schoolIdHash_0) === 'bigint' && schoolIdHash_0 >= 0 && schoolIdHash_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'eduproof.compact line 145 char 1',
                                     'Field',
                                     schoolIdHash_0)
        }
        if (!(typeof(subject_0) === 'bigint' && subject_0 >= 0 && subject_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'eduproof.compact line 145 char 1',
                                     'Field',
                                     subject_0)
        }
        if (!(typeof(slot_0) === 'bigint' && slot_0 >= 0n && slot_0 <= 255n)) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'eduproof.compact line 145 char 1',
                                     'Uint<0..256>',
                                     slot_0)
        }
        if (!(typeof(op_0) === 'bigint' && op_0 >= 0n && op_0 <= 255n)) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'eduproof.compact line 145 char 1',
                                     'Uint<0..256>',
                                     op_0)
        }
        if (!(typeof(operand_0) === 'bigint' && operand_0 >= 0 && operand_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'eduproof.compact line 145 char 1',
                                     'Field',
                                     operand_0)
        }
        if (!(Array.isArray(credential_0) && credential_0.length === 16 && credential_0.every((t) => typeof(t) === 'bigint' && t >= 0 && t <= __compactRuntime.MAX_FIELD))) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'eduproof.compact line 145 char 1',
                                     'Vector<16, Field>',
                                     credential_0)
        }
        if (!(typeof(signature_0) === 'object' && true && typeof(signature_0.response) === 'bigint' && signature_0.response >= 0 && signature_0.response <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('proveCredentialPredicate',
                                     'argument 7 (argument 8 as invoked from Typescript)',
                                     'eduproof.compact line 145 char 1',
                                     'struct SchnorrSignature<announcement: Opaque<"JubjubPoint">, response: Field>',
                                     signature_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(schoolIdHash_0).concat(_descriptor_0.toValue(subject_0).concat(_descriptor_4.toValue(slot_0).concat(_descriptor_4.toValue(op_0).concat(_descriptor_0.toValue(operand_0).concat(_descriptor_5.toValue(credential_0).concat(_descriptor_6.toValue(signature_0))))))),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_5.alignment().concat(_descriptor_6.alignment()))))))
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
                                                          credential_0,
                                                          signature_0);
        partialProofData.output = { value: _descriptor_2.toValue(result_0), alignment: _descriptor_2.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
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
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('registerIssuer', new __compactRuntime.ContractOperation());
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
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(0n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _transientHash_0(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_0, value_0);
    return result_0;
  }
  _transientHash_1(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_10, value_0);
    return result_0;
  }
  _jubjubPointX_0(np_0) {
    const result_0 = __compactRuntime.jubjubPointX(np_0);
    return result_0;
  }
  _jubjubPointY_0(np_0) {
    const result_0 = __compactRuntime.jubjubPointY(np_0);
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
  _getSchnorrReduction_0(context, partialProofData, challengeHash_0) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getSchnorrReduction(witnessContext_0,
                                                                              challengeHash_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 2  && typeof(result_0[0]) === 'bigint' && result_0[0] >= 0n && result_0[0] <= 127n && typeof(result_0[1]) === 'bigint' && result_0[1] >= 0n && result_0[1] <= 452312848583266388373324160190187140051835877600158453279131187530910662655n)) {
      __compactRuntime.typeError('getSchnorrReduction',
                                 'return value',
                                 'schnorr.compact line 60 char 1',
                                 '[Uint<0..128>, Uint<0..452312848583266388373324160190187140051835877600158453279131187530910662656>]',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_9.toValue(result_0),
      alignment: _descriptor_9.alignment()
    });
    return result_0;
  }
  _schnorrVerify_0(context, partialProofData, msg_0, signature_0, pk_0) {
    const announcement_0 = signature_0.announcement;
    const response_0 = signature_0.response;
    const cFull_0 = this._transientHash_1({ ann_x:
                                              this._jubjubPointX_0(announcement_0),
                                            ann_y:
                                              this._jubjubPointY_0(announcement_0),
                                            pk_x: this._jubjubPointX_0(pk_0),
                                            pk_y: this._jubjubPointY_0(pk_0),
                                            msg: msg_0 });
    const TWO_248_0 = 452312848583266388373324160190187140051835877600158453279131187530910662656n;
    const reduction_0 = this._getSchnorrReduction_0(context,
                                                    partialProofData,
                                                    cFull_0);
    const q_0 = reduction_0[0];
    const cTruncated_0 = reduction_0[1];
    let t_0;
    __compactRuntime.assert((t_0 = q_0, t_0 < 116n),
                            'Schnorr quotient out of range');
    __compactRuntime.assert(__compactRuntime.addField(__compactRuntime.mulField(q_0,
                                                                                TWO_248_0),
                                                      cTruncated_0)
                            ===
                            cFull_0,
                            'Invalid challenge reduction');
    const c_0 = cTruncated_0;
    const lhs_0 = this._ecMulGenerator_0(response_0);
    const rhs_0 = this._ecAdd_0(announcement_0, this._ecMul_0(pk_0, c_0));
    __compactRuntime.assert(this._jubjubPointX_0(lhs_0)
                            ===
                            this._jubjubPointX_0(rhs_0)
                            &&
                            this._jubjubPointY_0(lhs_0)
                            ===
                            this._jubjubPointY_0(rhs_0),
                            'bad issuer signature');
    return [];
  }
  _studentSecretKey_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.studentSecretKey(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0 && result_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('studentSecretKey',
                                 'return value',
                                 'eduproof.compact line 74 char 1',
                                 'Field',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _registerIssuer_0(context, partialProofData, schoolIdHash_0, issuerPk_0) {
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
                    throw new __compactRuntime.CompactError('eduproof.compact line 113 char 13: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                  }
                  return t1;
                })(actual_0);
    const b_0 = ((t1) => {
                  if (t1 > 18446744073709551615n) {
                    throw new __compactRuntime.CompactError('eduproof.compact line 114 char 13: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
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
  _subjectCommitment_0(sk_0) { return this._transientHash_0(sk_0); }
  _proveCredentialPredicate_0(context,
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
    this._schnorrVerify_0(context,
                          partialProofData,
                          credential_0,
                          signature_0,
                          issuerPk_0);
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
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(0n),
                                                                                                                                 alignment: _descriptor_11.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
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
                                     'eduproof.compact line 61 char 1',
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
                                     'eduproof.compact line 61 char 1',
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
      return _descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
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
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({
  getSchnorrReduction: (...args) => undefined,
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
                                 'eduproof.compact line 132 char 1',
                                 'Field',
                                 sk_0)
    }
    return _dummyContract._subjectCommitment_0(sk_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
