// Random ids for new items (SPEC 4.1: "random, e.g. nanoid(10)"), without a dependency.
import type { Id } from '../domain/types.ts';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-';
export const ID_LENGTH = 10;

/** `random` fills the byte array; defaults to the Web Crypto API. */
export function createIdGenerator(
  random: (bytes: Uint8Array<ArrayBuffer>) => Uint8Array = (bytes) => crypto.getRandomValues(bytes),
): () => Id {
  return () => {
    const bytes = random(new Uint8Array(ID_LENGTH));
    // 64 symbols: the low 6 bits of each byte pick one without bias.
    return Array.from(bytes, (b) => ALPHABET[b & 63] ?? '').join('');
  };
}
