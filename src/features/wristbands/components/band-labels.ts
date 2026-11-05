import type { HofPerson } from '@/features/wristbands/types';

/**
 * The short form of a band's UID the page shows: its last three bytes. The first byte is NXP's
 * on every band, so the end is what tells two bands apart.
 */
export const shortUid = (uid: string): string => `…${uid.slice(-6)}`;

/** "Lea Meier v/o Fuchs", the way the Cevi names a person with a Ceviname. */
export const personName = (person: Pick<HofPerson, 'fullName' | 'nickname'>): string =>
  person.nickname === null || person.nickname === ''
    ? person.fullName
    : `${person.fullName} v/o ${person.nickname}`;

/** Whether a person matches what was typed into the search, by name or Ceviname. */
export const matchesSearch = (person: HofPerson, search: string): boolean => {
  const query = search.trim().toLocaleLowerCase();
  if (query === '') return true;
  return [person.fullName, person.nickname ?? ''].some((name) =>
    name.toLocaleLowerCase().includes(query),
  );
};
