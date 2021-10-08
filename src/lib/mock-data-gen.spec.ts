import {expect} from 'chai';
import * as t from 'io-ts';
import {describe} from 'mocha';

import {gen, genOne} from './mock-data-gen';

describe(gen.name, () => {
  const testCases = [
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
    {typ: t.boolean, lowCardinality: true}
  ];
  for (const {typ, lowCardinality} of testCases) {
    it(`generates a valid ${typ.name}`, () => {
      const g = gen(typ);
      for (let i = 0; i < 10; ++i) {
        const value = g.next().value;
        console.log(value);
        expect(typ.is(value), `generated value must match type\nvalue:\t${value}\ntype:\t${typ.name}\n`).to.be.true;
      }
    });

    it(`generates deterministic output for ${typ.name}`, () => {
      const seeds = gen(t.number, {seed: Date.now()});
      for (let i = 0; i < 100; ++i) {
        const seed = seeds.next().value!;
        const v1 = genOne(typ, {seed});
        const v2 = genOne(typ, {seed});
        expect(v1).to.deep.equal(v2);
      }
    });

    it(`generates a different output for ${typ.name} with different seeds`, () => {
      const v1 = genOne(typ, {seed: 1});
      const v2 = genOne(typ, {seed: 2});
      if (!lowCardinality) {
        expect(v1).to.not.deep.equal(v2);
      }
    });
  }

  it('generates negative numbers', () => {
    const TUser = t.type({
      id: t.string,
      name: t.string,
      age: t.number
    });
    const g = gen(TUser);

    for (let i = 0; i < 100; i++) {
      const v = g.next().value as unknown as t.TypeOf<typeof TUser>;
      console.log(v);
      if (v.age < 0) {
        return;
      }
    }
    expect.fail('no negative number was generated');
  });

  interface ISevenToTen {
    readonly sevenToTen: unique symbol
  }

  const TSevenToTen = t.brand(t.number,
    (n: number): n is t.Branded<number, ISevenToTen> => n >= 7 && n <= 10,
    'sevenToTen');

  context('refinement types', () => {
    it('supports sevenToTen', () => {
      const sevenToTenG = gen(TSevenToTen, {
        seed: 10,
        namedTypeGens: {
          'sevenToTen': (r) => 7+r.random()*3.0
        }
      });
      for (let i=0; i<10000; ++i) {
        const value = sevenToTenG.next().value;
        expect(TSevenToTen.is(value), `generated value must match type\nvalue:\t${value}\ntype:\t${TSevenToTen.name}\n`).to.be.true;
      }
    });
  });

  context('intersection types', () => {
    it('foo', () => {
      const TSevenToTenInt = t.intersection([TSevenToTen, t.Int]);
      expect(TSevenToTenInt.name).to.eq('(sevenToTen & Int)');

      const sevenToTenIntG = gen(TSevenToTenInt, {
        namedTypeGens: {
          '(sevenToTen & Int)': r => r.intBetween(7, 10)
        }
      });
      for (let i=0; i<10000; ++i) {
        const value = sevenToTenIntG.next().value;
        console.log(value)
        expect(TSevenToTenInt.is(value), `${value} should be ${TSevenToTenInt.name}`).to.be.true;
      }
    });
  });
});
