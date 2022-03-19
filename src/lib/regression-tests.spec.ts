import * as t from 'io-ts';

import { gen } from './mock-data-gen';
import { withGenerator } from './withGenerator';
import { expect } from 'chai';


describe('regression tests', () => {
  it('#4/with generator should be properly seeded', () => {
    const TTest = withGenerator(t.number, (r) => r.intBetween(0, 1000));
    const generator = gen(TTest);
    const vals: number[] = [];
    for (let i=0; i<100; ++i) {
      const val = generator.next().value!;
      console.log(val);
      if (!vals.includes(val)) {
        vals.push(val);
      }
    }
    expect(vals.length > 1).to.be.true;
  });
});
