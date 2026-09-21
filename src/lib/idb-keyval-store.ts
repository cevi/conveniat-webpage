'use client';

/** IndexedDB database holding the persisted TanStack Query cache. */
const DATABASE_NAME = 'conveniat-db';
const DATABASE_VERSION = 1;

/** The single object store inside {@link DATABASE_NAME}, keyed by string. */
const STORE_NAME = 'keyval';

/**
 * Opens `conveniat-db` and runs `run` against its `keyval` store, resolving once the
 * transaction has finished and the connection is closed again.
 *
 * Everything after `indexedDB.open()` runs from an event handler, so a throw there escapes the
 * promise instead of rejecting it: the user gets an uncaught exception and the caller waits
 * forever. That is not hypothetical. Safari closes the connection when the page is hidden or
 * enters the back/forward cache, and `db.transaction()` then throws
 * `InvalidStateError: The database connection is closing.` — see
 * https://github.com/cevi/conveniat-webpage/issues/1656.
 *
 * A store we cannot reach is a cache miss, not a failure, so this resolves on every path and
 * never rejects. Callers read results from the requests they issue on the store; whatever they
 * did not manage to read stays untouched.
 *
 * The connection is closed as soon as the transaction settles. Holding it open would block
 * another tab from upgrading or deleting the database, which is how a connection ends up
 * closing underneath us in the first place.
 *
 * @param mode transaction mode to open the store with
 * @param run receives the store; issue requests on it and read their results in `onsuccess`
 */
export const withKeyvalStore = (
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => void,
): Promise<void> => {
  if (!('indexedDB' in globalThis)) return Promise.resolve();

  return new Promise((resolve) => {
    let isSettled = false;
    const settle = (database?: IDBDatabase): void => {
      if (isSettled) return;
      isSettled = true;
      try {
        database?.close();
      } catch {
        // the connection is already gone - nothing left to release
      }
      resolve();
    };

    try {
      const openRequest = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      /* eslint-disable unicorn/prefer-add-event-listener -- IDBRequest handlers are assigned. */
      openRequest.onupgradeneeded = (): void => {
        if (!openRequest.result.objectStoreNames.contains(STORE_NAME)) {
          openRequest.result.createObjectStore(STORE_NAME);
        }
      };
      openRequest.onerror = (): void => settle();
      openRequest.onsuccess = (): void => {
        const database = openRequest.result;
        try {
          const transaction = database.transaction(STORE_NAME, mode);
          transaction.oncomplete = (): void => settle(database);
          transaction.onabort = (): void => settle(database);
          transaction.onerror = (): void => {
            console.warn('[IdbKeyvalStore] Transaction failed:', transaction.error);
            settle(database);
          };
          run(transaction.objectStore(STORE_NAME));
        } catch (error) {
          console.warn('[IdbKeyvalStore] Store unavailable:', error);
          settle(database);
        }
      };
      /* eslint-enable unicorn/prefer-add-event-listener */
    } catch (error) {
      console.warn('[IdbKeyvalStore] Could not open the database:', error);
      settle();
    }
  });
};
