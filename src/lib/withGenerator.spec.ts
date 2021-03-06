/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from 'chai';
import * as fc from 'fast-check';
import * as t from 'io-ts';
import { describe } from 'mocha';

// import 'reflect-metadata';
import { gen } from './mock-data-gen';
import { arb } from './mock-data-gen-arb';
import { withGenerator } from './withGenerator';

describe(withGenerator.name, () => {
  const TMail = withGenerator(
    t.string,
    (r) => `user-${r.intBetween(0, 10000)}@company.com`
  );

  const mailGen = gen(TMail);
  for (let i = 0; i < 20; ++i) {
    it(`generates email addresses [${i}]`, () => {
      const email = mailGen.next().value!;
      expect(email.endsWith('@company.com')).to.be.true;
    });
  }

  it('produces arbitrary email addresses', () => {
    fc.assert(fc.property(arb(TMail), (mail) => mail.endsWith('@company.com')));
  });

  const TUser = t.type({ name: t.string, mail: TMail });

  const userGen = gen(TUser);
  for (let i = 0; i < 20; ++i) {
    it(`generates users [${i}]`, () => {
      const user = userGen.next().value!;
      expect(user.mail.endsWith('@company.com')).to.be.true;
    });
  }
});
