import * as t from 'io-ts';
import * as r from 'random-seed';
import {RandomSeed} from 'random-seed';

import {assertDefined} from "../types/requireDefined";
import {getGenerator} from "./withGenerator";

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

  const customGenerator = getGenerator(_typ);
  if (customGenerator !== undefined) {
    return customGenerator(rand);
  }

  const namedTypeGen = ctx.namedTypeGens[_typ.name];
  if (_typ instanceof t.Type && namedTypeGen) {
    assertDefined(namedTypeGen, `don't know how to generate for refinement type ${_typ.name}. Specify how in the context.`);
    return namedTypeGen(rand);
  }

  if (_typ instanceof t.StringType) {
    const chars: string[] = [];
    const N = 10;
    for (let i = 0; i < N; ++i) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      chars.push(randomPick((ALPHA + alpha + ' \n\t').split(''), rand)!)
    }
    return chars.join('');
  }
  if (_typ instanceof t.KeyofType) {
    return randomPick(Object.keys(((_typ as t.KeyofType<any>).keys as unknown as any[])), rand);
  }
  if (_typ instanceof t.NumberType) {
    switch (rand.intBetween(0, 9)) {
      case 0:
      case 1:
      case 2:
      case 3:
        return rand.intBetween(-10, 100);
      case 4:
      case 5:
      case 6:
      case 7:
        return rand.floatBetween(-10, 100);
      case 8:
        return rand.intBetween(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
      case 9:
        return rand.floatBetween(Number.MIN_VALUE, Number.MAX_VALUE);
      case 10:
        throw new Error('bug: numbertype choice too high');
    }
    // return rand.bind(0, 2) ? rand.intBetween(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER) : rand.floatBetween(Number.MIN_VALUE, Number.MAX_VALUE);
  }
  if (_typ instanceof t.LiteralType) {
    return (_typ as t.LiteralType<any>).value
  }
  if (_typ instanceof t.BooleanType) {
    return !!rand.intBetween(0,2);
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
  if (_typ instanceof t.DictionaryType) {
    const typ = _typ as t.DictionaryType<any, any>;
    const N = rand.intBetween(0, 10);
    const ret: Record<any, any> = {}
    for (let i = 0; i < N; ++i) {
      const key = genOne(typ.domain, {
        seed: rand.random()
      });
      ret[key] = genOne(typ.codomain, {seed: rand.random()});
    }
    return ret;
  }
  if (_typ instanceof t.UnknownType) {
    return genOne(randomPick([t.number, t.string, t.record(t.string, t.string), t.undefined, t.null] as t.Type<any>[], rand)!);
  }
  if (_typ instanceof t.TupleType) {
    const typ = _typ as t.TupleType<any>;
    return (typ.types as any[]).map(t => doGenValue(t, ctx));
  }
  if (_typ instanceof t.PartialType) {
    const typ = _typ as t.PartialType<any>;
    const ret: Record<string, unknown> = {};
    for (const [p, t] of Object.entries(typ.props)) {
      if (rand.intBetween(0, 4)) {
        ret[p] = doGenValue(t as t.Type<any>, ctx);
      }
    }
    return ret;
  }
  if (_typ instanceof t.IntersectionType) {
    const typ = _typ as t.IntersectionType<any>;
    const innerTypes = typ.types as t.Type<any>[];

    let ret: Record<string, unknown> = {};
    for (const innerType of innerTypes) {
      if (typeof innerType !== 'object' || !innerType.hasOwnProperty('props')) {
        throw new Error(`can not create value for intersection with inner type ${innerType.name}. Only intersections of objects with mutually exclusive domains are supported.`);
      }

      const innerVal = doGenValue(innerType, ctx) as Record<string, unknown>;
      for (const innerProp of Object.keys(innerVal)) {
        if (ret.hasOwnProperty(innerProp)) {
          throw new Error(`can not create value for intersection with inner type ${innerType.name}. Only intersections of objects with mutually exclusive domains are supported.`);
        }
      }
      ret = {...ret, ...innerVal};
    }
    return ret;
  }
  if (_typ instanceof t.AnyType) {
    return doGenValue(t.unknown, ctx);
  }
  if (_typ instanceof t.ReadonlyType) {
    const typ = _typ as t.ReadonlyType<any>;
    return doGenValue(typ.type as t.Type<any>, ctx);
  }
  if (_typ instanceof t.ReadonlyArrayType) {
    const typ = _typ as t.ReadonlyArrayType<any>;
    const itemType = typ.type as t.Type<any>;
    const writableArrayType: t.Type<any> = t.array(itemType);
    return doGenValue(writableArrayType, ctx);
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
