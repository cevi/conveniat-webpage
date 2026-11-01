import type { CollectionBeforeOperationHook, Where } from 'payload';

// `v/o` first, so "Max Muster v/o Ceviname" is not split at its own slash.
const NAME_SEPARATOR = /\s+v\/o\s+|\//i;

/**
 * Splits a list search for "Vorname Nachname / Ceviname" into the two fields it spans.
 *
 * The admin search runs a `like` on `fullName`, which holds the first and last name only, and
 * the Mongo adapter wants every word of the search in that one field. A name copied the way
 * people write it, with the Ceviname after a slash, therefore found nobody. Either side may be
 * left empty, so "/ Ceviname" searches the Ceviname alone.
 */
export const splitNameSearch = (where: Where): Where => {
  const like = (where['fullName'] as { like?: unknown } | undefined)?.like;
  const separator = typeof like === 'string' ? (NAME_SEPARATOR.exec(like) ?? undefined) : undefined;
  if (typeof like === 'string' && separator !== undefined && Object.keys(where).length === 1) {
    const name = like.slice(0, separator.index).trim();
    const nickname = like.slice(separator.index + separator[0].length).trim();
    const conditions: Where[] = [
      ...(name === '' ? [] : [{ fullName: { like: name } }]),
      ...(nickname === '' ? [] : [{ nickname: { like: nickname } }]),
    ];
    return conditions.length === 0 ? where : { and: conditions };
  }

  return Object.fromEntries(
    Object.entries(where).map(([key, value]) =>
      (key === 'and' || key === 'or') && Array.isArray(value)
        ? [key, value.map((condition: Where) => splitNameSearch(condition))]
        : [key, value],
    ),
  );
};

/** Applies {@link splitNameSearch} to every operation that carries a `where`. */
export const splitNameSearchHook: CollectionBeforeOperationHook = ({ args }) =>
  'where' in args ? { ...args, where: splitNameSearch(args.where ?? {}) } : args;
