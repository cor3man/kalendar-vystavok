// One tab at a time (SPEC 4.6): the first tab holds the Web Lock for as long as it is open.

export const LOCK_NAME = 'kalendar-data';

export interface TabLock {
  /** True when this tab got the lock; false when another tab or window holds it. */
  acquire(): Promise<boolean>;
}

/** Subset of `LockManager` used here, so tests can pass a fake. */
export interface LockRequester {
  request(
    name: string,
    options: { ifAvailable: boolean },
    callback: (lock: unknown) => Promise<unknown> | undefined,
  ): Promise<unknown>;
}

export function createWebTabLock(locks: LockRequester | undefined): TabLock {
  return {
    acquire: () =>
      new Promise<boolean>((resolve) => {
        if (locks === undefined) {
          // No Web Locks (very old browser): nothing to coordinate with, act as the only tab.
          resolve(true);
          return;
        }
        void locks.request(LOCK_NAME, { ifAvailable: true }, (lock) => {
          if (lock === null) {
            resolve(false);
            return undefined;
          }
          resolve(true);
          // Never settles: the lock is released only when the tab closes.
          return new Promise<never>(() => undefined);
        });
      }),
  };
}

/** For tests and single-tab contexts. */
export const alwaysOwnerLock: TabLock = { acquire: () => Promise.resolve(true) };
