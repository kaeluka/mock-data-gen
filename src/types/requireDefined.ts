import assert from 'assert';

export function assertDefined<T>(x: T | undefined, message?: string): asserts x is T {
  assert(x !== undefined, message);
}
