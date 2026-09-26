/** The camp name every Hof event carries, with or without the leading "Hauptlager". */
const CAMP_NAME = /(?:hauptlager\s+)?conveniat\s*27/giu;

/** Dashes, colons and the like left dangling once the camp name is cut out. */
const DANGLING_SEPARATORS = /^[\s,:|–—-]+|[\s,:|–—-]+$/gu;

/**
 * A first name for a Hof that was just discovered in Cevi.DB.
 *
 * Its events are all called something like "Hauptlager conveniat27 - Altstetten", so the
 * camp name is cut out of the first one and what remains names the Hof. Only a starting
 * point: editors rename a Hof freely, and neither the sync nor the migration touch a name
 * once the Hof exists.
 *
 * @param eventNames the names of the Hof's events, in any order
 * @param groupId the Cevi.DB group, used when no event name has anything left to offer
 */
export const deriveHofName = (eventNames: readonly unknown[], groupId: string): string => {
  const firstName = eventNames.find(
    (name): name is string => typeof name === 'string' && name.trim() !== '',
  );
  if (firstName === undefined) return `Hof ${groupId}`;

  const stripped = firstName
    .replaceAll(CAMP_NAME, ' ')
    .replaceAll(/\s{2,}/gu, ' ')
    .replaceAll(DANGLING_SEPARATORS, '')
    .trim();

  return stripped === '' ? firstName.trim() : stripped;
};
