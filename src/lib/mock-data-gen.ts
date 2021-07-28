import * as t from 'io-ts';
import {RandomSeed} from 'random-seed';
import * as r from 'random-seed';

import {assertDefined} from "../types/requireDefined";

const randomPick = <T>(xs: T[], rand: RandomSeed) => {
  if (xs.length) {
    const i = rand.intBetween(0, xs.length - 1);
    return xs[i];
  } else {
    return undefined;
  }
}

interface GenerateCtx {
  rand: RandomSeed,
  namedTypeGens: Partial<Record<string, (r: RandomSeed) => unknown>>,
}

const defaultGenerators: GenerateCtx['namedTypeGens'] = {
  'Int': (r) => r.intBetween(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
  'Date': (r) => new Date(r.random()),
}

function defaultCtx(rand: RandomSeed, additionalGenerators: GenerateCtx['namedTypeGens']): GenerateCtx {
  return {
    namedTypeGens: {...defaultGenerators, ...additionalGenerators},
    rand,
  };
}

const alpha = 'abcdefghijklmnopqrst';
const ALPHA = alpha.toUpperCase();

/* eslint-disable @typescript-eslint/no-explicit-any */
function doGenValue<R, T extends t.Type<R>>(_typ: T, ctx: GenerateCtx): unknown {
  const {rand} = ctx;
  if (_typ instanceof t.StringType) {
    const chars: string[] = [];
    const N = 10;
    for (let i = 0; i < N; ++i) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      chars.push(randomPick((ALPHA + alpha).split(''), rand)!)
    }
    return chars.join('');
  }
  if (_typ instanceof t.NumberType) {
    return rand.random();
  }
  if (_typ instanceof t.LiteralType) {
    return (_typ as t.LiteralType<any>).value
  }
  if (_typ instanceof t.UnionType) {
    const type: t.Type<any> | undefined = randomPick(((_typ as t.UnionType<any>).types) as t.Type<any>[], rand);
    assertDefined(type);
    return doGenValue(type, ctx);
  }
  if (_typ instanceof t.InterfaceType) {
    const typ: t.InterfaceType<any> = _typ as t.InterfaceType<any>;
    const ret: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(typ.props)) {
      ret[k] = doGenValue(v as t.Type<unknown>, ctx);
    }
    return ret;
  }
  if (_typ instanceof t.TupleType) {
    const typ = _typ as t.TupleType<any>;
    return (typ.types as any[]).map(t => doGenValue(t, ctx));
  }
  if (_typ instanceof t.ArrayType) {
    const typ = _typ as t.ArrayType<any>;
    const N = rand.intBetween(0, 7);
    const ret: unknown[] = [];
    for (let i = 0; i < N; ++i) {
      ret.push(doGenValue(typ.type, ctx));
    }
    return ret;
  }
  if (_typ instanceof t.UndefinedType) {
    return undefined;
  }
  if (_typ instanceof t.NullType) {
    return null;
  }
  if (_typ instanceof t.BigIntType) {
    const min = Number.MIN_SAFE_INTEGER;
    const max = Number.MAX_SAFE_INTEGER;
    const i1 = BigInt(rand.intBetween(min, max));
    const i2 = BigInt(rand.intBetween(min, max));
    return i1 * i2;
  }
  const namedTypeGen = ctx.namedTypeGens[_typ.name];
  if (_typ instanceof t.Type && namedTypeGen) {
    assertDefined(namedTypeGen, `don't know how to generate for refinement type ${_typ.name}. Specify how in the context.`);
    return namedTypeGen(rand);
  }

  throw new Error(`no generator for type ${_typ.name}`)
}

/* eslint-enable @typescript-eslint/no-explicit-any */

interface GenCfg {
  seed?: number,
  namedTypeGens?: GenerateCtx['namedTypeGens'],
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function* gen<T extends t.Type<any>>(typ: T, cfg?: GenCfg) {
  const rand = r.create(`${cfg?.seed ?? 0}`);
  while (true) {
    yield doGenValue(typ, defaultCtx(rand, cfg?.namedTypeGens ?? {})) as t.TypeOf<T>;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function genOne<T extends t.Type<any>>(typ: T, cfg?: GenCfg): t.TypeOf<T> {
  return gen(typ, cfg).next().value
}
