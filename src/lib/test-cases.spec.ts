import * as t from "io-ts";
import {UUID} from "io-ts-types";

export const testCases = [
  {typ: t.string},
  {typ: t.number},
  {typ: t.literal('1'), lowCardinality: true},
  {typ: t.union([t.literal('TRUE'), t.literal('FALSE')])},
  {typ: t.keyof({foo: null, bar:null})},
  {
    typ: t.type({
      long: t.number,
      lat: t.number,
      name: t.string,
    })
  },
  {typ: t.Int},
  {typ: t.tuple([t.number, t.string])},
  {typ: t.array(t.string)},
  {typ: t.undefined, lowCardinality: true},
  {typ: t.null, lowCardinality: true},
  {typ: t.bigint},
  {typ: t.record(t.string, t.unknown)},
  {typ: t.partial({n: t.number, s: t.string})},
  {typ: t.intersection([t.type({id: t.string}), t.partial({n: t.number})])},
  {typ: t.any},
  {typ: t.readonlyArray(t.number)},
  {typ: t.readonly(t.number)},
  {typ: t.boolean, lowCardinality: true},
  {typ: UUID}
];
