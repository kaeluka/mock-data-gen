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

## Installation

See instructions in npm: [mock-data-gen](https://www.npmjs.com/package/mock-data-gen).

## Limitations

Not every single definition in `io-ts` can be supported out of the box.
Branded types need special treatment.

Branded types in `io-ts` are types that refine an existing `io-ts` by a
predicate that dynamically govern whether a value is included in the type.

If we create a branded type that contains all numbers from 7 to 10 
(inclusive), it'll look like that in `io-ts`:

```typescript
interface ISevenToTen {
  readonly sevenToTen: unique symbol
}

const TSevenToTen = t.brand(t.number,
  (n: number): n is t.Branded<number, ISevenToTen> => n >= 7 && n <= 10,
  'sevenToTen');
```

Of course, `mock-data-gen` is unable to efficiently generate examples 
satisfying this specification out of the box. What you can do, is to 
specify how to generate such values manually, by including it in the
configuration via the `namedTypeGens` property:

```typescript
const sevenToTenG = gen(TSevenToTen, {
  namedTypeGens: {
    'sevenToTen': (r) => 7+r.random()*3.0
  }
});
for (let i=0; i<100; ++i) {
  const value = sevenToTenG.next().value;
  expect(TSevenToTen.is(value), `generated value must match type\nvalue:\t${value}\ntype:\t${TSevenToTen.name}\n`).to.be.true;
}
```
