// noinspection ExceptionCaughtLocallyJS

import { expect } from 'chai';
import { Arbitrary } from 'fast-check';
import * as fc from 'fast-check';
import * as t from 'io-ts';
import { date, UUID } from 'io-ts-types';
import { describe } from 'mocha';

import { arb } from './mock-data-gen-arb';
import { testCases } from './test-cases.spec';

describe(arb.name, () => {
  for (const { typ } of testCases) {
    it(`generates valid ${typ.name}-s`, () => {
      fc.assert(
        fc.property(arb(typ), (x) => {
          expect(typ.is(x)).to.be.true;
        })
      );
    });
  }

  context('sample properties', function () {
    this.timeout(10000);
    const x: Arbitrary<number | undefined> = fc.oneof(
      fc.nat(),
      fc.nat().map((x) => -x)
    );

    it('test', () => {
      console.log(fc.sample(x, { numRuns: 10, seed: Date.now() }));
    });

    context('users', () => {
      const TDBUser = t.type({
        id: UUID,
        name: t.string,
        birthdate: t.union([t.string, date, t.undefined]),
      });

      type DBUser = t.TypeOf<typeof TDBUser>;

      const params = { numRuns: 1000, seed: 0 };

      const birthdaybrokeninfix = ',';
      const getBirthdateString = (user: DBUser): string => {
        if (user.birthdate && user.name.includes(birthdaybrokeninfix)) {
          // BUG: when birthdate is string, there's no toISOString method:
          return (user.birthdate as Date).toISOString();
        } else if (user.birthdate instanceof Date) {
          return user.birthdate.toISOString();
        } else {
          return user.birthdate ?? 'none';
        }
      };

      it('finds the rare birthdate bug', () => {
        try {
          fc.assert(
            fc.property(arb(TDBUser), (user) => {
              getBirthdateString(user);
            }),
            params
          );
          throw new Error('should not pass');
        } catch (e) {
          expect(e.toString())
            .includes('Counterexample:')
            .and.includes(birthdaybrokeninfix);
        }
      });

      const persist = (users: DBUser[]) => {
        const db: string[] = [];
        for (const user of users) {
          if (db.includes(user.id)) {
            throw new Error(`user with login '${user.id}' already exists`);
          }
          db.push(user.id);
        }
      };

      it('finds the exception when adding several users twice', () => {
        try {
          fc.assert(fc.property(arb(t.array(TDBUser)), persist), params);
          throw new Error('should not pass');
        } catch (e) {
          expect(e.toString())
            .includes('Counterexample:')
            .and.matches(/user with login.*already exists/);
        }
      });
    });

    context('ordered timestamps', () => {
      const TTimestamp = t.type({
        createdAt: date,
        updatedAt: date,
      });

      const assertOnlyOrderedTimestamps = (
        ts: t.TypeOf<typeof TTimestamp>[]
      ) => {
        if (
          ts.filter((timestamp) => timestamp.updatedAt < timestamp.createdAt)
            .length
        ) {
          throw Error('unordered timestamp');
        }
      };

      it('finds bugs from out-of-order dates', () => {
        expect(() =>
          fc.assert(
            fc.property(arb(t.array(TTimestamp)), assertOnlyOrderedTimestamps)
          )
        ).to.throw();
      });

      it('finds bugs from out-of-order dates, even with more complicated types', () => {
        expect(() =>
          fc.assert(
            fc.property(
              arb(
                t.array(
                  t.intersection([
                    TTimestamp,
                    t.partial({
                      eventName: t.keyof({
                        eventA: null,
                        eventB: null,
                        eventC: null,
                      }),
                    }),
                  ])
                )
              ),
              assertOnlyOrderedTimestamps
            )
          )
        ).to.throw();
      });
    });
  });

  context('regression', () => {
    it('knows about default named type generators, even when custom ones are supplied', () => {
      fc.assert(
        fc.property(
          arb(UUID, {
            namedArbs: {
              Test: fc.string(),
            },
          }),
          () => true
        )
      );
    });
  });
});
