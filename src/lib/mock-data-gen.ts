import * as fc from 'fast-check';
import { Arbitrary } from 'fast-check';
import * as t from 'io-ts';
import * as _ from 'lodash';
import * as r from 'random-seed';
import { RandomSeed } from 'random-seed';

import { arb, GenerateArbCtx } from './mock-data-gen-arb';
import { randomUUID } from './random-helpers';

const defaultCfg: Required<GenCfg> = {
  namedTypeGens: {
    Int: (r) => r.intBetween(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
    Date: (r) =>
      new Date(
        r.intBetween(
          new Date(1970, 1, 1).valueOf(),
          new Date(2100, 1, 1).valueOf()
        )
      ),
    UUID: (r) => randomUUID(r.random()),
  },
  seed: 0,
};

function doGenValue<R, T extends t.Type<R>>(
  _typ: T,
  seed: number,
  ctx: GenerateArbCtx
): unknown {
  return fc.sample(arb(_typ, ctx), { seed, numRuns: 1 })[0];
}

interface GenCfg {
  seed?: number;
  namedTypeGens?: Record<string, (r: RandomSeed) => unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function* gen<T extends t.Type<any>>(
  typ: T,
  cfg?: GenCfg
): Generator<t.TypeOf<T>> {
  const mergedCfg: Required<GenCfg> = _.merge(defaultCfg, cfg);

  const namedArbs: Record<string, Arbitrary<unknown>> = {};
  for (const [name, typeGen] of Object.entries(mergedCfg.namedTypeGens)) {
    namedArbs[name] = fc.nat().map((seed) => typeGen(r.create(`${seed}`)));
  }

  while (true) {
    yield doGenValue(typ, mergedCfg.seed, {
      namedArbs,
    });
    mergedCfg.seed++;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function genOne<T extends t.Type<any>>(
  typ: T,
  cfg?: GenCfg
): t.TypeOf<T> {
  return gen(typ, cfg).next().value;
}
