// import {RandomSeed} from "random-seed";
import 'reflect-metadata';
import * as t from 'io-ts';
import * as _ from 'lodash';
import * as r from 'random-seed';

const key = `mock-data-gen-${withGenerator.name}`;
export function withGenerator<A, O, I>(
  t: t.Type<A, O, I>,
  gen: (r: r.RandomSeed) => A
): t.Type<A, O, I> {
  const metadata = Reflect.getMetadata(key, t);
  if (metadata) {
    throw new Error(`can not use ${withGenerator.name} twice`);
  }
  const retT = _.cloneDeep(t); // need to clone this, otherwise a global constant might be annotated!
  Reflect.defineMetadata(key, gen, retT);
  return retT;
}

export function getGenerator<A, O, I>(
  t: t.Type<A, O, I>
): (r: r.RandomSeed) => A {
  return Reflect.getMetadata(key, t);
}

// export function Test(target: object, propertyKey: string) {
//   const key = `mock-data-gen-${Test.name}-${propertyKey}`;
//   const metadata = Reflect.getMetadata(key, target);
//   Reflect.defineMetadata(key, [...metadata, `${Test.name}-${propertyKey}`], target);
// }
