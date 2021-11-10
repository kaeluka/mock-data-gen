# mock-data-gen

Generate random mock data from io-ts types for property based testing using `fast-check` and for traditional unit testing.

## Intro

This library will take an `io-ts` specification as an input and create random
values satisfying the specification for you.

These values, you can get as an `Arbitrary` instance for property based testing using `fast-check`, or as simple values,
for traditional unit testing.

By default, the output is deterministic, but you are able to supply a random
seed of your own (eg. `Date.now()`) to get non-deterministic output.

## Examples

### Generate a single value eg., for unit testing:

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

### Generate many values by using a generator:

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

### Property based testing using `fast-check`

Lets assume we have a function that persists users to a DB. It does not handle the case
when a user already exists in the DB gracefully:
```typescript
const persist = (users: DBUser[]) => {
  const db: string[] = [];
  for (const user of users) {
    if (db.includes(user.id)) {
      throw new Error(`user with login '${user.id}' already exists`);
    }
    db.push(user.id);
  }
};
```

We can find this bug easily by generating an *arbitrary array of
`DBUsers` (`arb(t.array(TDBUser))`). Using that, we can simply try
to persist that arbitrary array:

```typescript
import * as fc from 'fast-check';

fc.assert(fc.property(arb(t.array(TUser)), persist));
```

We almost immediately find the problem, `fast-check` throws the error:
```
Property failed after 32 tests
{ seed: 0, path: "31:1:1:6:6:13:13:13", endOnFailure: true }
Counterexample: [[{"id":"ffffffff-ffff-4fff-ffff-ffffff4c88ce","name":"","birthdate":new Date("1970-01-01T00:00:00.000Z")},{"id":"ffffffff-ffff-4fff-ffff-ffffff4c88ce","name":"","birthdate":new Date("1970-01-01T00:00:00.000Z")}]]
Shrunk 7 time(s)
Got error: Error: user with login 'ffffffff-ffff-4fff-ffff-ffffff4c88ce' already exists
```
The counterexample is a small input that exhibits the bug, and in this case,
is a pretty good indication of what the underlying problem was in the code
while omitting unnecessary details.

## Limitations

Not every single definition in `io-ts` can be supported out of the box.
Branded types and intersection types need special treatment.

### Branded Types
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
satisfying this specification out of the box. A generic algorithm would generate
using `t.number` until one number accidentally satisfies the predicate.
This is, of course, not even guaranteed to ever succeed.


### Intersection Types

Like branded types, we can't efficiently generically produce examples for intersection types.

Consider the type `TSevenToTenInt`:

```typescript
const TSevenToTenInt = t.intersection([t.Int, TSevenToTen]);
```

If you squint a little, this is a bit like a Branded type using t.Int as a base type
and `TSevenToTen.is` as a predicate.

### Producing Values anyways

What you can do, is to specify how to generate values for such problematic types manually.

#### namedTypeGens/namedArbs
By including an algorithm to produce values in the
configuration via the `namedTypeGens` property, you can circumvent the problem:
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

Same for `TSevenToTen`:

```typescript
const sevenToTenIntG = gen(TSevenToTenInt, {
  namedTypeGens: {
    '(sevenToTen & Int)': r => r.intBetween(7, 10)
  }
});
for (let i=0; i<10000; ++i) {
  const value = sevenToTenIntG.next().value;
  expect(TSevenToTenInt.is(value), `${value} should be ${TSevenToTenInt.name}`).to.be.true;
}
```

As an alternative, you may use the `withGenerator` function that attaches a generator function
to the type object itself via `reflect-metadata`. The following example
would derive a type from `t.string` that produces only valid email addresses:

```typescript
const TMail = withGenerator(
  t.string,
  (r) => `user-${r.intBetween(0, 10000)}@company.com`
);
```

Confirmation using a unit test:
```typescript
const email = genOne(TMail);
expect(email.endsWith('@company.com')).to.be.true;
```

Confirmation using property based testing:
```typescript
fc.assert(fc.property(arb(TMail), (mail) => mail.endsWith('@company.com')));
```

# How to Contribute

Ideally, create an issue explaining the problem context that you're trying to fix.
In your commit message, please reference that issue.

Thank you for contributing :)
