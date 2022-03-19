/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from 'chai';
import * as t from 'io-ts';
import { date } from 'io-ts-types';
import { describe } from 'mocha';

import { gen, genOne } from './mock-data-gen';
import { randomString } from './random-helpers';
import { testCases } from './test-cases.spec';

describe(gen.name, () => {
  for (const { typ, lowCardinality } of testCases) {
    it(`generates a valid ${typ.name}`, () => {
      const g = gen(typ);
      for (let i = 0; i < 10; ++i) {
        const value = g.next().value;
        expect(
          typ.is(value),
          `generated value must match type\nvalue:\t${value}\ntype:\t${typ.name}\n`
        ).to.be.true;
      }
    });

    it(`generates deterministic output for ${typ.name}`, () => {
      const seeds = gen(t.number, { seed: Date.now() });
      for (let i = 0; i < 100; ++i) {
        const seed = seeds.next().value!;
        const v1 = genOne(typ, { seed });
        const v2 = genOne(typ, { seed });
        expect(v1).to.deep.equal(v2);
      }
    });

    it('creates independent generators', () => {
      const generator1 = gen(t.string);
      const firstValue1 = generator1.next().value;

      for (let i = 0; i < 10; i++) {
        generator1.next();
      }

      const generator2 = gen(t.string);
      const firstValue2 = generator2.next().value;

      expect(firstValue1).to.equal(firstValue2);
    });

    it(`generates a different output for ${typ.name} with different seeds`, () => {
      const v1 = genOne(typ, { seed: 1 });
      const v2 = genOne(typ, { seed: 2 });
      if (!lowCardinality) {
        expect(v1).to.not.deep.equal(v2);
      }
    });
  }

  it('generates users that sometimes have negative ages', () => {
    const TUser = t.type({
      id: t.string,
      name: t.string,
      age: t.number,
    });
    const g = gen(TUser);

    for (let i = 0; i < 100; i++) {
      const v = g.next().value as unknown as t.TypeOf<typeof TUser>;
      if (v.age < 0) {
        return;
      }
    }
    expect.fail('no negative number was generated');
  });

  interface ISevenToTen {
    readonly sevenToTen: unique symbol;
  }

  const TSevenToTen = t.brand(
    t.number,
    (n: number): n is t.Branded<number, ISevenToTen> => n >= 7 && n <= 10,
    'sevenToTen'
  );

  context('refinement types', () => {
    it('supports sevenToTen', () => {
      const sevenToTenG = gen(TSevenToTen, {
        seed: 10,
        namedTypeGens: {
          sevenToTen: (r) => 7 + r.random() * 3.0,
        },
      });
      for (let i = 0; i < 10; ++i) {
        const value = sevenToTenG.next().value;
        expect(
          TSevenToTen.is(value),
          `generated value must match type\nvalue:\t${value}\ntype:\t${TSevenToTen.name}\n`
        ).to.be.true;
      }
    });
  });

  context('named type generators', () => {
    it('supports integers between seven and ten', () => {
      const TSevenToTenInt = t.intersection([TSevenToTen, t.Int]);
      expect(TSevenToTenInt.name).to.eq('(sevenToTen & Int)');

      const sevenToTenIntG = gen(TSevenToTenInt, {
        namedTypeGens: {
          '(sevenToTen & Int)': (r) => r.intBetween(7, 10),
        },
      });
      for (let i = 0; i < 10000; ++i) {
        const value = sevenToTenIntG.next().value;
        expect(
          TSevenToTenInt.is(value),
          `${value} should be ${TSevenToTenInt.name}`
        ).to.be.true;
      }
    });

    context('regression', () => {
      it('knows about default named type generators, even when custom ones are supplied', () => {
        genOne(date, {
          namedTypeGens: {
            Test: (r) => randomString('0123456789', 10)(r.random()),
          },
        });
      });
    });
  });
});
