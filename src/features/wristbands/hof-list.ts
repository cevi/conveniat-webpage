/*
The people of a Hof as the station shows them: who still needs a band, grouped by Abteilung the
way the AVP calls them up, and whom a search finds. Pure functions over the Hof's list, so the
order, the search and the changes to the cached list can be tested without a phone.
*/

import type { HofBand, HofPerson, HofWristbandList } from '@/features/wristbands/types';

const NAME_ORDER = new Intl.Collator('de-CH', { sensitivity: 'base', numeric: true });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readBand = (value: unknown): HofBand | null =>
  isRecord(value) && typeof value['uid'] === 'string'
    ? { uid: value['uid'], status: value['status'] === 'revoked' ? 'revoked' : 'active' }
    : null;

/**
 * A person as the client has them, read defensively: a list restored from yesterday's
 * persisted query cache may not know the Abteilung, the role or the helpers yet, and reads as
 * one Abteilung of participants without helpers until the fresh list arrives.
 */
const readPerson = (value: unknown): HofPerson | undefined => {
  if (!isRecord(value) || typeof value['registrationId'] !== 'string') return undefined;
  const { registrationId, fullName, nickname, abteilung, role, band } = value;
  return {
    registrationId,
    fullName: typeof fullName === 'string' ? fullName : '',
    nickname: typeof nickname === 'string' && nickname !== '' ? nickname : null,
    abteilung: typeof abteilung === 'string' && abteilung !== '' ? abteilung : null,
    role: role === 'leader' ? 'leader' : 'participant',
    band: readBand(band),
    helper: value['helper'] === true,
  };
};

/** The Hof's list, every field checked, so a list of an older shape cannot crash the page. */
export const readWristbandList = (value: unknown): HofWristbandList => {
  const people = isRecord(value) && Array.isArray(value['people']) ? value['people'] : [];
  const spare = isRecord(value) && Array.isArray(value['spareBands']) ? value['spareBands'] : [];
  return {
    people: people.map((entry) => readPerson(entry)).filter((entry) => entry !== undefined),
    spareBands: spare.map((entry) => readBand(entry)).filter((entry) => entry !== null),
  };
};

/** By Abteilung, a person without one last, then by name. */
export const comparePeople = (a: HofPerson, b: HofPerson): number => {
  if (a.abteilung !== b.abteilung) {
    if (a.abteilung === null) return 1;
    if (b.abteilung === null) return -1;
    return NAME_ORDER.compare(a.abteilung, b.abteilung);
  }
  return NAME_ORDER.compare(a.fullName, b.fullName);
};

/** Whether a person matches what was typed into the search, by name or Ceviname. */
export const matchesSearch = (person: HofPerson, search: string): boolean => {
  const query = search.trim().toLocaleLowerCase('de-CH');
  if (query === '') return true;
  return [person.fullName, person.nickname ?? ''].some((name) =>
    name.toLocaleLowerCase('de-CH').includes(query),
  );
};

/** How many of the Hof's people wear a band, for "34 / 86 mit Band". */
export const bandProgress = (people: HofPerson[]): { withBand: number; total: number } => ({
  withBand: people.filter((person) => person.band !== null).length,
  total: people.length,
});

/** Who wears a band, if anyone of the Hof does. */
export const wearerOf = (people: HofPerson[], uid: string): HofPerson | undefined =>
  people.find((person) => person.band?.uid === uid);

/** The list once a band went to a person: it is theirs, and no spare any more. */
export const withBandAssigned = (
  list: HofWristbandList,
  uid: string,
  registrationId: string,
): HofWristbandList => ({
  people: list.people.map((person) => {
    if (person.registrationId === registrationId)
      return { ...person, band: { uid, status: 'active' } };
    return person.band?.uid === uid ? { ...person, band: null } : person;
  }),
  spareBands: list.spareBands.filter((band) => band.uid !== uid),
});

/** The list once a band came back: nobody wears it, and it is a spare of the Hof. */
export const withBandReturned = (list: HofWristbandList, uid: string): HofWristbandList => ({
  people: list.people.map((person) =>
    person.band?.uid === uid ? { ...person, band: null } : person,
  ),
  spareBands: list.spareBands.some((band) => band.uid === uid)
    ? list.spareBands
    : [...list.spareBands, { uid, status: 'active' }],
});

/** The list once a new band is recorded for the Hof and nobody wears it. */
export const withSpareBand = (list: HofWristbandList, uid: string): HofWristbandList =>
  wearerOf(list.people, uid) === undefined ? withBandReturned(list, uid) : list;

/** The list once the AVP named a person a helper, or took it back. */
export const withHelper = (
  list: HofWristbandList,
  registrationId: string,
  helper: boolean,
): HofWristbandList => ({
  ...list,
  people: list.people.map((person) =>
    person.registrationId === registrationId ? { ...person, helper } : person,
  ),
});

/** One Abteilung of the list, with the people of it the station shows. */
export interface StationGroup {
  /** null for the people whose registration names no Abteilung */
  abteilung: string | null;
  people: HofPerson[];
}

/**
 * What the station lists. Without a search, who still needs a band, by Abteilung and name: the
 * list the AVP calls the people up by. With a search, everyone it finds by name, a band or not,
 * since a person with a band is found to give them a new one for a lost one; those without a
 * band first.
 */
export const stationList = (
  people: HofPerson[],
  search: string,
): { searching: boolean; groups: StationGroup[] } => {
  const searching = search.trim() !== '';
  const shown = people
    .filter((person) => (searching ? matchesSearch(person, search) : person.band === null))
    .toSorted((a, b) => {
      if (!searching) return comparePeople(a, b);
      if ((a.band === null) !== (b.band === null)) return a.band === null ? -1 : 1;
      return NAME_ORDER.compare(a.fullName, b.fullName);
    });
  if (searching) {
    return { searching, groups: shown.length === 0 ? [] : [{ abteilung: null, people: shown }] };
  }

  const groups: StationGroup[] = [];
  for (const person of shown) {
    const last = groups.at(-1);
    if (last?.abteilung === person.abteilung) last.people.push(person);
    else groups.push({ abteilung: person.abteilung, people: [person] });
  }
  return { searching, groups };
};
