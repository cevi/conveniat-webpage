/**
 * Normalises whatever an `organiser` array entry turns out to be into a comparable id string.
 *
 * Three shapes reach here. Payload hands back a populated user document at `depth >= 1` and a
 * bare id at `depth: 0`, and the bare id is a Mongo `ObjectId` rather than a string, so it only
 * yields its hex through `toHexString()`. Anything else is not an id and is ignored rather than
 * stringified into `[object Object]`, which would silently compare unequal to every user.
 */
const toIdString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;

  if (typeof value === 'object' && value !== null && 'toHexString' in value) {
    const toHexString: unknown = value.toHexString;
    if (typeof toHexString === 'function') {
      const hex: unknown = toHexString.call(value);
      if (typeof hex === 'string') return hex;
    }
  }

  return undefined;
};

/**
 * Whether `userId` organises the entry whose `organiser` relationship this is.
 *
 * Organiser-ship is not a role. A Cevi member organises a workshop or a helper shift without
 * necessarily having any admin-panel access, so this must never be folded into a role check -
 * it is decided per entry, by the relationship, and by nothing else.
 *
 * The three call sites in `schedule-router` each used to assume a different one of the shapes
 * `toIdString` handles: two cast to `User[]` and read `.id`, one cast to `string[]` and compared
 * directly. Whichever assumption is wrong at runtime fails silently - `.id` on a bare id is
 * `undefined`, and `undefined` equals no user id, so a real organiser is reported as not being
 * one and loses the admin actions and the participant list. Normalising every shape here takes
 * the guess away from the callers.
 */
export const isOrganiserOf = (organiser: unknown, userId: string | undefined): boolean => {
  if (userId === undefined || userId === '') return false;
  if (!Array.isArray(organiser)) return false;

  return organiser.some((entry: unknown) => {
    if (entry === null || entry === undefined) return false;

    // A populated document carries the id in `id`; a bare id *is* the value.
    const raw: unknown = typeof entry === 'object' && 'id' in entry ? entry.id : entry;
    return toIdString(raw) === userId;
  });
};
