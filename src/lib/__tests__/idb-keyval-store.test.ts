/**
 * @jest-environment jsdom
 */

import { withKeyvalStore } from '@/lib/idb-keyval-store';

interface OpenRequestStub {
  result: unknown;
  onsuccess?: () => void;
  onerror?: () => void;
  onupgradeneeded?: () => void;
}

/**
 * Stands in for `indexedDB.open()`. The returned request fires `onsuccess` on the next
 * macrotask, the way a browser does, so handlers assigned by the code under test are in place
 * by the time they run.
 */
const stubIndexedDatabase = (transaction: (mode: string) => unknown): { close: jest.Mock } => {
  const close = jest.fn();
  const database = {
    objectStoreNames: { contains: (): boolean => true },
    transaction,
    close,
  };

  const open = (): OpenRequestStub => {
    const request: OpenRequestStub = { result: database };
    setTimeout(() => request.onsuccess?.(), 0);
    return request;
  };

  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    value: { open },
  });

  return { close };
};

/** A transaction whose store answers `get` with `value` and completes right afterwards. */
const workingTransaction = (value: unknown) => (): unknown => {
  const transaction: Record<string, unknown> = {};
  transaction['objectStore'] = (): unknown => ({
    get: (): unknown => {
      const request: { result: unknown; onsuccess?: () => void } = { result: value };
      setTimeout(() => {
        request.onsuccess?.();
        (transaction['oncomplete'] as (() => void) | undefined)?.();
      }, 0);
      return request;
    },
  });
  return transaction;
};

describe('withKeyvalStore', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
    Reflect.deleteProperty(globalThis, 'indexedDB');
  });

  it('hands the store to the caller and closes the connection afterwards', async () => {
    const { close } = stubIndexedDatabase(workingTransaction('cached'));

    let read: unknown;
    await withKeyvalStore('readonly', (store) => {
      const request = store.get('conveniat-query-cache-idb');
      request.onsuccess = (): void => {
        read = request.result;
      };
    });

    expect(read).toBe('cached');
    expect(close).toHaveBeenCalledTimes(1);
  });

  // Safari closes the connection when the page is hidden or enters the back/forward cache, and
  // `db.transaction()` then throws from inside the open request's success handler - where a
  // throw used to escape the promise and leave the caller waiting forever.
  // see: https://github.com/cevi/conveniat-webpage/issues/1656
  it('resolves instead of throwing when the connection is closing', async () => {
    const { close } = stubIndexedDatabase(() => {
      throw new DOMException(
        "Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.",
        'InvalidStateError',
      );
    });

    const use = jest.fn();
    await expect(withKeyvalStore('readwrite', use)).resolves.toBeUndefined();

    expect(use).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('resolves when the browser denies IndexedDB entirely', async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: {
        open: (): never => {
          throw new DOMException('The user denied permission to access the database.');
        },
      },
    });

    await expect(withKeyvalStore('readonly', jest.fn())).resolves.toBeUndefined();
  });

  it('resolves when there is no IndexedDB at all', async () => {
    Reflect.deleteProperty(globalThis, 'indexedDB');

    const use = jest.fn();
    await expect(withKeyvalStore('readonly', use)).resolves.toBeUndefined();
    expect(use).not.toHaveBeenCalled();
  });
});
