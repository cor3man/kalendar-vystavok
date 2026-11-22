import { describe, expect, it, vi } from 'vitest';
import { createUpdateStore } from '../../../src/state/updateStore.ts';

function setup() {
  const calls: string[] = [];
  const store = createUpdateStore({
    flush: () => {
      calls.push('flush');
      return Promise.resolve();
    },
    reload: () => calls.push('reload'),
  });
  const activate = vi.fn(() => {
    calls.push('activate');
    return Promise.resolve();
  });
  return { store, calls, activate };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('update store (SPEC 5.9)', () => {
  it('shows nothing until a new version is waiting', () => {
    const { store } = setup();
    expect(store.getState().available).toBe(false);
  });

  it('the update button saves first, then activates the waiting version', async () => {
    const { store, calls, activate } = setup();
    store.getState().setAvailable(activate);
    expect(store.getState().available).toBe(true);
    await store.getState().update();
    expect(calls).toEqual(['flush', 'activate']);
    expect(store.getState().updating).toBe(true);
  });

  it('update without a waiting version does nothing', async () => {
    const { store, calls } = setup();
    await store.getState().update();
    expect(calls).toEqual([]);
  });

  it('a second press does not activate twice', async () => {
    const { store, activate } = setup();
    store.getState().setAvailable(activate);
    await Promise.all([store.getState().update(), store.getState().update()]);
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it('reloads after saving when no dialog is open', async () => {
    const { store, calls } = setup();
    store.getState().requestReload();
    await tick();
    expect(calls).toEqual(['flush', 'reload']);
  });

  it('never reloads while a dialog is open; reloads when the last one closes', async () => {
    const { store, calls } = setup();
    store.getState().dialogOpened();
    store.getState().dialogOpened(); // e.g. a confirmation over the catalogue
    store.getState().requestReload();
    await tick();
    expect(calls).toEqual([]);
    store.getState().dialogClosed();
    await tick();
    expect(calls).toEqual([]);
    store.getState().dialogClosed();
    await tick();
    expect(calls).toEqual(['flush', 'reload']);
  });

  it('waits again when a dialog opens while saving', async () => {
    let finishFlush: () => void = () => undefined;
    const reload = vi.fn();
    const store = createUpdateStore({
      flush: () =>
        new Promise<void>((r) => {
          finishFlush = r;
        }),
      reload,
    });
    store.getState().requestReload();
    store.getState().dialogOpened();
    finishFlush();
    await tick();
    expect(reload).not.toHaveBeenCalled();
    store.getState().dialogClosed();
    finishFlush();
    await tick();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('closing dialogs without a pending reload never reloads', async () => {
    const { store, calls } = setup();
    store.getState().dialogOpened();
    store.getState().dialogClosed();
    store.getState().dialogClosed(); // never below zero
    await tick();
    expect(calls).toEqual([]);
    expect(store.getState().openDialogs).toBe(0);
  });
});
