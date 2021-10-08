import * as r from 'random-seed';

export const randomPick = <T>(seed: number, xs: T[]): T => xs[r.create(`${seed}`).intBetween(0, xs.length-1)];

export const randomString = (alphabet:string, N: number) => (seed: number): string => {
  let ret: string[] = [];
  const chars = alphabet.split('');
  for (let i=0; i<N; ++i) {
    ret.push(randomPick(seed+i, chars));
  }
  return ret.join('');
}

const hex = '0123456789abcdef';
export const randomUUID = (seed: number): string =>
  `ffffffff-ffff-4fff-ffff-ffffff${randomString(hex,6)(seed++)}`;
