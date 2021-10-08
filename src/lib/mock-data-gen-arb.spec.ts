import { expect } from 'chai';
import * as fc from 'fast-check';
import { console } from 'fp-ts';
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
          console.log(x);
          expect(typ.is(x)).to.be.true;
        })
      );
    });
  }

  context('sample properties', function () {
    this.timeout(50000);

    context('users', () => {
      const TUser = t.type({
        id: UUID,
        name: t.string,
        birthdate: t.union([t.string, date, t.undefined]),
      });

      type User = t.TypeOf<typeof TUser>;

      const numRuns = 100000;

      const birthdaybrokensuffix = '?x';
      const getBirthdateString = (user: User): string => {
        if (user.birthdate && user.name.endsWith(birthdaybrokensuffix)) {
          // BUG: when birthdate is string, there's no toISOString method:
          return (user.birthdate as Date).toISOString();
        } else if (user.birthdate instanceof Date) {
          return user.birthdate.toISOString();
        } else {
          return user.birthdate ?? 'none';
        }
      };

      it('eventually finds the rare birthdate bug', () => {
        try {
          fc.assert(
            fc.property(arb(TUser), (user) => {
              getBirthdateString(user);
            }),
            { numRuns }
          );
          throw new Error('should not pass');
        } catch (e) {
          expect(e.toString())
            .includes('Counterexample:')
            .and.includes(birthdaybrokensuffix);
        }
      });

      const persist = (users: User[]) => {
        const db: string[] = [];
        for (let user of users) {
          if (db.includes(user.id)) {
            throw new Error(`user with login '${user.id}' already exists`);
          }
          db.push(user.id);
        }
      };

      it('finds the exception when adding several users twice', () => {
        try {
          fc.assert(fc.property(arb(t.array(TUser)), persist), { numRuns });
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
});
