/**
 * Who is typing where, fed by `typing` events from the realtime stream.
 *
 * Senders repeat the signal while they type, so an entry lives only {@link TYPING_TTL_MS}
 * past the last one. There is no "stopped typing" event to lose: the dots go away on their
 * own, or immediately when that person's message arrives.
 */

export const TYPING_TTL_MS = 4000;

export interface Typist {
  userId: string;
  name: string;
  /** When this person started typing, in epoch ms. */
  since: number;
}

interface TypingEntry extends Typist {
  timer: ReturnType<typeof setTimeout>;
}

const EMPTY: Typist[] = [];
const entriesByKey = new Map<string, Map<string, TypingEntry>>();
// snapshots are cached per key so useSyncExternalStore sees a stable array between changes
const snapshots = new Map<string, Typist[]>();
const listeners = new Set<() => void>();

const keyOf = (chatId: string, parentId: string | undefined): string =>
  `${chatId}:${parentId ?? 'main'}`;

const publish = (key: string): void => {
  const entries = entriesByKey.get(key);
  if (entries === undefined || entries.size === 0) {
    entriesByKey.delete(key);
    snapshots.delete(key);
  } else {
    snapshots.set(
      key,
      [...entries.values()].map(({ userId, name, since }) => ({ userId, name, since })),
    );
  }
  for (const listener of listeners) listener();
};

const remove = (key: string, userId: string): void => {
  const entry = entriesByKey.get(key)?.get(userId);
  if (entry === undefined) return;
  clearTimeout(entry.timer);
  entriesByKey.get(key)?.delete(userId);
  publish(key);
};

/** Marks `userId` as typing in the chat (or thread) for the next few seconds. */
export const recordTyping = (
  chatId: string,
  userId: string,
  name: string,
  parentId?: string,
): void => {
  const key = keyOf(chatId, parentId);
  const entries = entriesByKey.get(key) ?? new Map<string, TypingEntry>();
  entriesByKey.set(key, entries);

  const existing = entries.get(userId);
  if (existing !== undefined) clearTimeout(existing.timer);
  const timer = setTimeout(() => remove(key, userId), TYPING_TTL_MS);
  entries.set(userId, { userId, name, since: existing?.since ?? Date.now(), timer });
  // a refresh of someone already shown changes nothing on screen
  if (existing?.name !== name) publish(key);
};

/** Drops `userId` from the chat (or thread) right away, e.g. because their message arrived. */
export const clearTyping = (chatId: string, userId: string, parentId?: string): void =>
  remove(keyOf(chatId, parentId), userId);

export const subscribeTyping = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return (): void => {
    listeners.delete(listener);
  };
};

/** The people typing in the chat (or thread), as a stable snapshot. */
export const getTypists = (chatId: string, parentId?: string): Typist[] =>
  snapshots.get(keyOf(chatId, parentId)) ?? EMPTY;

export const getNoTypists = (): Typist[] => EMPTY;
