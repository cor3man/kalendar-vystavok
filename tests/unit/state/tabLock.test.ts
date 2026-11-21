import { describe, expect, it } from 'vitest';
import { LOCK_NAME, createWebTabLock, type LockRequester } from '../../../src/state/tabLock.ts';

/** Grants each lock name once, like a browser with the first tab still open. */
function fakeLocks(): LockRequester & { held: Set<string> } {
  const held = new Set<string>();
  return {
    held,
    request(name, _options, callback) {
      const free = !held.has(name);
      if (free) held.add(name);
      return Promise.resolve(callback(free ? { name } : null));
    },
  };
}

describe('createWebTabLock', () => {
  it('lets the first tab own the lock and makes the second one read-only', async () => {
    const locks = fakeLocks();
    expect(await createWebTabLock(locks).acquire()).toBe(true);
    expect(locks.held.has(LOCK_NAME)).toBe(true);
    expect(await createWebTabLock(locks).acquire()).toBe(false);
  });

  it('acts as the only tab without Web Locks', async () => {
    expect(await createWebTabLock(undefined).acquire()).toBe(true);
  });
});
