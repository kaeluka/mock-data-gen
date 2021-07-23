# mock-data-gen

Generate random mock data from io-ts types.

## Intro

This library will take an `io-ts` specification as an input and create random 
values satisfying the specification for you.

By default, the output is deterministic, but you are able to supply a random
seed of your own (eg. `Date.now()`) to get non-deterministic output.

## Examples

Generate a single value: 

```typescript
const TPerson = t.type({
  firstName: t.string,
  lastName: t.string,
  gender: t.union([t.string, t.undefined])
});

const p = genOne(TPerson);
console.log(p); // { firstName: 'HCBcoFhlne', lastName: 'iFHbcmrFRa', gender: undefined }
expect(TPerson.is(p)).to.be.true;
```

Generate many values:

```typescript
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
```


