import * as fc from 'fast-check';
import { Arbitrary } from 'fast-check';
import * as t from 'io-ts';
import * as _ from 'lodash';
import * as r from 'random-seed';
import { RandomSeed } from 'random-seed';

import { arb } from './mock-data-gen-arb';
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
/* eslint-disable @typescript-eslint/no-explicit-any */
function doGenValue<R, T extends t.Type<R>>(
  _typ: T,
  ctx: Required<GenCfg>
): unknown {
  const { seed, namedTypeGens } = ctx;
  const namedArbs: Record<string, Arbitrary<any>> = {};
  for (const [name, typeGen] of Object.entries(namedTypeGens)) {
    namedArbs[name] = fc.nat().map((seed) => typeGen(r.create(`${seed}`)));
  }
  const sample = fc.sample(
    arb(_typ, {
      namedArbs,
    }),
    { seed, numRuns: 1 }
  );
  return sample[0];
}

/* eslint-enable @typescript-eslint/no-explicit-any */

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

  while (true) {
    yield doGenValue(typ, mergedCfg);
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
