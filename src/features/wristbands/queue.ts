/*
The queue the AVP hands bands out by: the people of the Hof without a band, by Abteilung and
then by name, the way a Hof lines up. Pure functions over the Hof's list, so the order, the
filters, skipping and undoing can be tested without a phone.
*/

import type { HofBand, HofPerson, HofRole, HofWristbandList } from '@/features/wristbands/types';

/** Which people the queue and the list show. */
export interface PeopleFilters {
  /** one Abteilung, or null for all of the Hof's */
  abteilung: string | null;
  role: HofRole | 'all';
}

/** Which people of the list show, by their band. */
export type BandFilter = 'without' | 'with' | 'all';

export const NO_FILTERS: PeopleFilters = { abteilung: null, role: 'all' };

/** Where the AVP moved people out of the plain order. */
export interface QueueOrder {
  /** put first, the one first in the array first: a person chosen, brought back or undone */
  front: string[];
  /** moved to the end, the one skipped first first */
  skipped: string[];
}

export const EMPTY_ORDER: QueueOrder = { front: [], skipped: [] };

export interface Queue {
  /** "Jetzt dran": the person the next band goes to */
  current: HofPerson | undefined;
  /** who comes after */
  next: HofPerson[];
  /** the skipped people, in the order they were skipped, the current one left out */
  skipped: HofPerson[];
  /** how many wait without a band, the current one included */
  waiting: number;
}

const NAME_ORDER = new Intl.Collator('de-CH', { sensitivity: 'base', numeric: true });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readBand = (value: unknown): HofBand | null =>
  isRecord(value) && typeof value['uid'] === 'string'
    ? { uid: value['uid'], status: value['status'] === 'revoked' ? 'revoked' : 'active' }
    : null;

/**
 * A person as the client has them, read defensively: a list restored from yesterday's
 * persisted query cache knows neither the Abteilung nor the role yet, and reads as one
 * Abteilung of participants until the fresh list arrives.
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

/** The Abteilungen of the Hof, in the order of the queue. */
export const abteilungenOf = (people: HofPerson[]): string[] =>
  [...new Set(people.map((person) => person.abteilung))]
    .filter((abteilung) => abteilung !== null)
    .toSorted((a, b) => NAME_ORDER.compare(a, b));

export const matchesFilters = (person: HofPerson, filters: PeopleFilters): boolean =>
  (filters.abteilung === null || person.abteilung === filters.abteilung) &&
  (filters.role === 'all' || person.role === filters.role);

/** Whether a person matches what was typed into the search, by name or Ceviname. */
export const matchesSearch = (person: HofPerson, search: string): boolean => {
  const query = search.trim().toLocaleLowerCase('de-CH');
  if (query === '') return true;
  return [person.fullName, person.nickname ?? ''].some((name) =>
    name.toLocaleLowerCase('de-CH').includes(query),
  );
};

const matchesBand = (person: HofPerson, band: BandFilter): boolean =>
  band === 'all' || (band === 'with') === (person.band !== null);

/** The people the list shows, in the order of the queue. */
export const filterPeople = (
  people: HofPerson[],
  filters: PeopleFilters & { band: BandFilter; search: string },
): HofPerson[] =>
  people
    .filter(
      (person) =>
        matchesFilters(person, filters) &&
        matchesBand(person, filters.band) &&
        matchesSearch(person, filters.search),
    )
    .toSorted(comparePeople);

/** How many of the queue's next people the screen shows under "Danach". */
const NEXT_COUNT = 3;

/**
 * The queue: who is "Jetzt dran", who comes after, and who was skipped. Only people without a
 * band wait. A person put to the front stands there whatever the filters, since the AVP chose
 * them by name; everybody else follows the filters, by Abteilung and name, and the skipped
 * ones come last, so the queue still ends with them once everybody else has a band.
 */
export const buildQueue = (
  people: HofPerson[],
  filters: PeopleFilters,
  order: QueueOrder,
): Queue => {
  const byId = new Map(people.map((person) => [person.registrationId, person]));
  const waitsById = (id: string): HofPerson | undefined => {
    const person = byId.get(id);
    return person?.band === null ? person : undefined;
  };
  const front = order.front.map((id) => waitsById(id)).filter((person) => person !== undefined);
  const placed = new Set([...order.front, ...order.skipped]);
  const regular = people
    .filter(
      (person) =>
        person.band === null &&
        !placed.has(person.registrationId) &&
        matchesFilters(person, filters),
    )
    .toSorted(comparePeople);
  const skipped = order.skipped
    .filter((id) => !order.front.includes(id))
    .map((id) => waitsById(id))
    .filter((person) => person !== undefined);

  const line = [...new Set([...front, ...regular, ...skipped])];
  const [current, ...rest] = line;
  return {
    current,
    next: rest.slice(0, NEXT_COUNT),
    skipped: skipped.filter((person) => person !== current),
    waiting: line.length,
  };
};

const without = (ids: string[], id: string): string[] => ids.filter((entry) => entry !== id);

/** Moves a person to the end of the queue, under "Übersprungen". */
export const skipPerson = (order: QueueOrder, id: string): QueueOrder => ({
  front: without(order.front, id),
  skipped: [...without(order.skipped, id), id],
});

/**
 * Puts a person first: one brought back from "Übersprungen", one the AVP chose by name, or one
 * whose band was just taken back by an undo.
 */
export const putFirst = (order: QueueOrder, id: string): QueueOrder => ({
  front: [id, ...without(order.front, id)],
  skipped: without(order.skipped, id),
});

/** The order without the people who wear a band now, so it does not grow over the camp. */
export const pruneOrder = (order: QueueOrder, people: HofPerson[]): QueueOrder => {
  const waiting = new Set(
    people.filter((person) => person.band === null).map((person) => person.registrationId),
  );
  return {
    front: order.front.filter((id) => waiting.has(id)),
    skipped: order.skipped.filter((id) => waiting.has(id)),
  };
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
