import * as fc from 'fast-check';
import { Arbitrary } from 'fast-check';
import * as t from 'io-ts';
import * as _ from 'lodash';
import * as r from 'random-seed';

import { assertDefined } from '../types/requireDefined';

import { randomUUID } from './random-helpers';
import { getGenerator } from './withGenerator';

export interface GenerateArbCtx {
  namedArbs: Partial<Record<string, Arbitrary<unknown>>>;
}

function defaultCtx(): GenerateArbCtx {
  return {
    namedArbs: {
      Int: fc.oneof(
        fc.nat(),
        fc.nat().map((n) => -n)
      ),
      Date: fc.nat().map((n) => new Date(n)),
      UUID: fc.nat().map(randomUUID),
    },
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function doGenArb<R, T extends t.Type<R>>(
  _typ: T,
  ctx: GenerateArbCtx
): Arbitrary<t.TypeOf<T>> {
  type Ret = Arbitrary<any>;

  const customGenerator = getGenerator(_typ);
  if (customGenerator !== undefined) {
    return fc.constant(undefined).map(() => customGenerator(r.create('0')));
  }

  const namedArb = ctx.namedArbs[_typ.name];
  if (_typ instanceof t.Type && namedArb) {
    assertDefined(
      namedArb,
      `don't know how to generate for refinement type ${_typ.name}. Specify how in the context.`
    );
    return namedArb as Ret;
  }

  if (_typ instanceof t.StringType) {
    return fc.string() as Ret;
  }
  if (_typ instanceof t.KeyofType) {
    const keys = Object.keys(
      (_typ as t.KeyofType<any>).keys
    ) as unknown as string[];
    return fc.oneof(...keys.map(fc.constant)) as Ret;
  }
  if (_typ instanceof t.NumberType) {
    const num = fc.oneof(fc.nat(), fc.integer(), fc.float()) as Ret;
    return fc.oneof(
      num,
      num.map((x) => -x)
    );
  }
  if (_typ instanceof t.LiteralType) {
    return fc.constant((_typ as t.LiteralType<any>).value) as Ret;
  }
  if (_typ instanceof t.BooleanType) {
    return fc.boolean() as Ret;
  }
  if (_typ instanceof t.UnionType) {
    const types = (_typ as t.UnionType<any>).types as t.Type<any>[];
    return fc.oneof(...types.map((t) => doGenArb(t, ctx)));
  }
  if (_typ instanceof t.InterfaceType) {
    const typ = _typ as t.InterfaceType<any>;
    const props = typ.props as Record<string, t.Type<any>>;
    const recordModel: Record<string, Arbitrary<any>> = {};
    for (const [k, t] of Object.entries(props)) {
      recordModel[k] = doGenArb(t, ctx);
    }
    return fc.record(recordModel) as Ret;
  }
  if (_typ instanceof t.DictionaryType) {
    // TODO
    const typ = _typ as t.DictionaryType<any, any>;
    const domain = typ.domain as t.Type<any>;
    const codomain = typ.codomain as t.Type<any>;
    return fc
      .array(fc.tuple(doGenArb(domain, ctx), doGenArb(codomain, ctx)))
      .map((kvs) => {
        const ret: Record<any, any> = {};
        for (const [k, v] of kvs) {
          ret[k] = v;
        }
        return ret;
      }) as Ret;
  }
  if (_typ instanceof t.UnknownType) {
    return fc.anything() as Ret;
  }
  if (_typ instanceof t.TupleType) {
    const typ = _typ as t.TupleType<any>;
    return fc.tuple(
      ...typ.types.map((t: t.Type<any>) => doGenArb(t, ctx))
    ) as Ret;
  }
  if (_typ instanceof t.PartialType) {
    // TODO
    const typ = _typ as t.PartialType<any>;
    const props: Record<string, t.Type<any>> = typ.props;
    const optionalProps: Record<string, t.Type<any>> = {};
    for (const [k, v] of Object.entries(props)) {
      optionalProps[k] = t.union([v, t.undefined]);
    }
    const partialTyp: t.Type<any> = t.type(optionalProps);
    return doGenArb(partialTyp, ctx) as Ret;
  }
  if (_typ instanceof t.IntersectionType) {
    const typ = _typ as t.IntersectionType<any>;
    const types = typ.types as t.Type<any>[];

    const innerArbs: Arbitrary<any>[] = [];
    const allProps: string[] = [];
    for (const _innerTyp of types) {
      if (
        typeof _innerTyp !== 'object' ||
        !Object.getOwnPropertyDescriptor(_innerTyp, 'props')
      ) {
        throw new Error(
          `can not create value for intersection with inner type ${_innerTyp.name}. Only intersections of objects with mutually exclusive domains are supported.`
        );
      }

      const innerTyp: typeof _innerTyp & { props: Record<any, any> } =
        _innerTyp as unknown as any;

      for (const k of Object.keys(innerTyp.props)) {
        if (allProps.includes(k)) {
          throw new Error(
            `can not create value for intersection with inner type ${innerTyp.name}. Only intersections of objects with mutually exclusive domains are supported.`
          );
        }
      }
      allProps.push(...Object.keys(innerTyp.props));
      innerArbs.push(doGenArb(innerTyp, ctx));
    }

    return fc.tuple(...innerArbs).map((innerVals) => {
      const ret: Record<any, any> = {};
      for (const innerVal of innerVals) {
        Object.assign(ret, innerVal);
      }
      return ret;
    }) as Ret;
  }
  if (_typ instanceof t.AnyType) {
    return fc.anything() as Ret;
  }
  if (_typ instanceof t.ReadonlyType) {
    const typ = _typ as t.ReadonlyType<any>;
    return doGenArb(typ.type as t.Type<any>, ctx);
  }
  if (_typ instanceof t.ReadonlyArrayType) {
    const typ = _typ as t.ReadonlyArrayType<any>;
    const itemType = typ.type as t.Type<any>;
    const writableArrayType: t.Type<any> = t.array(itemType);
    return doGenArb(writableArrayType, ctx) as Ret;
  }

  if (_typ instanceof t.ArrayType) {
    const typ = _typ as t.ArrayType<any>;
    return fc.array(doGenArb(typ.type, ctx)) as Ret;
  }
  if (_typ instanceof t.UndefinedType) {
    return fc.constant(undefined) as Ret;
  }
  if (_typ instanceof t.NullType) {
    return fc.constant(null) as Ret;
  }
  if (_typ instanceof t.BigIntType) {
    return fc.bigInt() as Ret;
  }
  throw new Error(`no generator for type ${_typ.name}`);
}

export function arb<T extends t.Type<any>>(
  typ: T,
  cfg?: GenerateArbCtx
): Arbitrary<t.TypeOf<T>> {
  const mergedCfg: Required<GenerateArbCtx> = _.merge(defaultCtx(), cfg);
  return doGenArb(typ, mergedCfg);
}

/* eslint-enable @typescript-eslint/no-explicit-any */
