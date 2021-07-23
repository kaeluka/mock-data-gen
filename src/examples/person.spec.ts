import { expect } from 'chai';
import * as t from 'io-ts';

import { gen, genOne } from '../../build/main';

describe('TPerson', () => {
  const TPerson = t.type({
    firstName: t.string,
    lastName: t.string,
    gender: t.union([t.string, t.undefined])
  });

  it('generates a random person', () => {
    const p = genOne(TPerson);
    console.log(p); // { firstName: 'HCBcoFhlne', lastName: 'iFHbcmrFRa', gender: undefined }
    expect(TPerson.is(p)).to.be.true;
  })

  it('generates many random people', () => {
    const generator = gen(TPerson);
    let n=0;
    while (n < 10) {
      const p = generator.next().value;
      console.log(p);
      // { firstName: 'HCBcoFhlne', lastName: 'iFHbcmrFRa', gender: undefined }
      // { firstName: 'rLnOganLCJ', lastName: 'MODLInnhQj', gender: 'aitptOOKHm' }
      // ...
      expect(TPerson.is(p)).to.be.true;
      ++n;
    }
  })

})
