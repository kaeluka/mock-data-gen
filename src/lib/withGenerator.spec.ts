import { expect } from 'chai';
import * as t from 'io-ts';
import {describe} from 'mocha';
import 'reflect-metadata';
import {gen} from "./mock-data-gen";
import {withGenerator} from "./withGenerator";


describe(withGenerator.name, () => {
  const TMail = withGenerator(t.string, (r) => `user-${r.intBetween(0, 10000)}@company.com`)

  const mailGen = gen(TMail);
  for (let i=0; i<20; ++i) {
    it(`generates email addresses [${i}]`, () => {
      const email = mailGen.next().value!;
      console.log(email);
      expect(email.endsWith('@company.com')).to.be.true;
    });
  }

  const TUser = t.type({name: t.string, mail: TMail});

  const userGen = gen(TUser);
  for (let i=0; i<20; ++i) {
    it(`generates users [${i}]`, () => {
      const user = userGen.next().value!;
      console.log(user);
      expect(user.mail.endsWith('@company.com')).to.be.true;
    });
  }
});
