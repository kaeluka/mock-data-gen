import {expect} from 'chai';
import * as t from 'io-ts';
import {describe} from 'mocha';

import {gen} from "./mock-data-gen";

describe(gen.name, () => {
  for (const {typ} of [
    {typ: t.string},
    {typ: t.number},
    {typ: t.literal('1')},
    {typ: t.union([t.literal('TRUE'), t.literal('FALSE')])},
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
    {typ: t.undefined},
    {typ: t.null},
    {typ: t.bigint},
  ]) {
    it(`generates a valid ${typ.name}`, () => {
      const g = gen(typ);
      for (let i = 0; i < 10; ++i) {
        const value = g.next().value;
        console.log(value);
        expect(typ.is(value), `generated value must match type\nvalue:\t${value}\ntype:\t${typ.name}\n`).to.be.true;
      }
    });
  }

  context('refinement types', () => {
    it('sevenToTen', () => {
      interface ISevenToTen {
        readonly sevenToTen: unique symbol
      }
      const sevenToTenT = t.brand(t.number,
        (n: number): n is t.Branded<number, ISevenToTen> => n >= 7 && n <= 10,
        'sevenToTen');

      const sevenToTenG = gen(sevenToTenT, {
        seed: 10,
        namedTypeGens: {
          'sevenToTen': (r) => 7+r.random()*3.0
        }
      });
      for (let i=0; i<10000; ++i) {
        const value = sevenToTenG.next().value;
        expect(sevenToTenT.is(value), `generated value must match type\nvalue:\t${value}\ntype:\t${sevenToTenT.name}\n`).to.be.true;
      }
    });
  });
});


