// import {RandomSeed} from "random-seed";
import 'reflect-metadata';
import * as t from 'io-ts';
import * as r from "random-seed";

// function Generate<T>(g: (r: RandomSeed) => T) {
//   return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
//
//   }
// }

const key = `mock-data-gen-${withGenerator.name}`;
export function withGenerator<A,O,I>(t: t.Type<A,O,I>, gen: (r: r.RandomSeed) => A): t.Type<A,O,I> {
  const metadata = Reflect.getMetadata(key, t);
  if (metadata) {
    throw new Error(`can not use ${withGenerator.name} twice`);
  }
  Reflect.defineMetadata(key, gen, t);
  return t;
}

export function getGenerator<A,O,I>(t: t.Type<A,O,I>): ((r: r.RandomSeed) => A) {
  return Reflect.getMetadata(key, t);
}

// export function Test(target: object, propertyKey: string) {
//   const key = `mock-data-gen-${Test.name}-${propertyKey}`;
//   const metadata = Reflect.getMetadata(key, target);
//   Reflect.defineMetadata(key, [...metadata, `${Test.name}-${propertyKey}`], target);
// }
