/**
 * Matches the canonical UUID form used for `Message.uuid`.
 */
const UUID_PATTERN = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

/**
 * RFC 4122 version 4 UUID fallback for contexts where `crypto.randomUUID` is
 * unavailable (it requires a secure context, so plain-HTTP LAN builds lack it).
 */
const randomUuidFallback = (): string => {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index++) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // version 4
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // variant 10xx

  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/**
 * Generates the *permanent* id of a new message.
 *
 * The client owns the message identity: the same id is used for the optimistic bubble,
 * for the `messageId` sent to the server, for the offline outbox entry and for the row
 * that ends up in the database. That is what makes `chat.sendMessage` replayable — a
 * retry (offline outbox drain, lost response, reload mid-flight) carries the same id, so
 * the server recognises it as the message it already stored instead of creating a second
 * one.
 */
export const generateMessageId = (): string => {
  if (typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return randomUuidFallback();
};

/**
 * True when `id` is a client-generated id the server can adopt verbatim.
 */
export const isServerCompatibleMessageId = (id: string): boolean => UUID_PATTERN.test(id);

/**
 * Legacy ids looked like `optimistic-<ts>-<rand>` and could never be persisted, so the
 * server assigned a different id which the client had to swap in afterwards. Caches and
 * outboxes written by older app versions still contain them.
 */
export const isLegacyOptimisticId = (id: string): boolean => id.startsWith('optimistic-');

/**
 * Validates if a cached message matches either a specific optimistic ID or the general optimistic prefix.
 */
export const isOptimisticMessageMatch = (itemId: string, optimisticId?: string): boolean => {
  return typeof optimisticId === 'string' ? itemId === optimisticId : isLegacyOptimisticId(itemId);
};

/**
 * Replaces the locally created message identified by `optimisticId` — or an entry that
 * already carries the server id — with the server's version, dropping any leftover
 * duplicate of that message.
 *
 * Since ids are stable, the optimistic entry and the stored message share an id. A naive
 * "does the list already contain the server id?" check would mistake the optimistic bubble
 * for the stored copy and delete the message from the cache, so matching and de-duplication
 * have to happen in a single pass.
 */
export const mergeStoredMessageAcrossPages = <T extends { id: string }>(
  pages: T[][],
  storedMessage: T,
  optimisticId: string | undefined,
): T[][] => {
  let hasStored = false;

  return pages.map((items) => {
    const merged: T[] = [];
    for (const item of items) {
      const isReplaceable =
        item.id === storedMessage.id || isOptimisticMessageMatch(item.id, optimisticId);

      if (!isReplaceable) {
        merged.push(item);
      } else if (!hasStored) {
        // keep the first occurrence only, drop any further copies
        hasStored = true;
        merged.push(storedMessage);
      }
    }
    return merged;
  });
};

/**
 * Single-list variant of {@link mergeStoredMessageAcrossPages}.
 */
export const mergeStoredMessage = <T extends { id: string }>(
  items: T[],
  storedMessage: T,
  optimisticId: string | undefined,
): T[] => mergeStoredMessageAcrossPages([items], storedMessage, optimisticId)[0] ?? [];
