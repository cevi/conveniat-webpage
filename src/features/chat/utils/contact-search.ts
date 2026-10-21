import type { Contact } from '@/features/chat/api/queries/list-contacts';
import { formatHofRoles } from '@/features/payload-cms/payload-cms/utils/hof-directory';

/**
 * The Hof line under a contact, one part per Hof, e.g. "AVP, Cevi Uster, Quartier 3"
 * for the Hof's AVP and "Züri 11, Quartier 1" for everyone else. Empty for someone at no Hof.
 *
 * Every field is optional: a browser restores the contacts it cached before they existed, and
 * falls back to the plain Höfe and Quartiere then.
 */
export const describeContactHof = (contact: Contact): string => {
  if (contact.hofRoles !== undefined) return formatHofRoles(contact.hofRoles);
  return [(contact.hoefe ?? []).join(', '), (contact.quartiere ?? []).join(', ')]
    .filter((part) => part !== '')
    .join(' · ');
};

/**
 * The functions of a contact in the camp organisation, e.g. "Ressortleitung Infrastruktur".
 * Empty for most people, and for contacts cached before functions existed.
 */
export const describeContactFunktionen = (contact: Contact): string =>
  (contact.funktionen ?? []).join(', ');

/**
 * Whether a contact matches the address book search, by name, nickname, description,
 * function or Hof.
 */
export const matchesContactSearch = (contact: Contact, search: string): boolean => {
  const query = search.toLowerCase().trim();
  if (query === '') return true;
  return [
    contact.name,
    contact.nickname,
    contact.description,
    ...(contact.funktionen ?? []),
    ...(contact.hoefe ?? []),
    ...(contact.quartiere ?? []),
    // "AVP" finds every AVP
    ...(contact.hofRoles?.some(({ isAvp }) => isAvp) === true ? ['AVP'] : []),
  ].some((text) => typeof text === 'string' && text.toLowerCase().includes(query));
};

/**
 * The line under a contact's name: functions, Höfe and the description from Cevi.DB, e.g.
 * "Ressortleitung Infrastruktur · AVP, Cevi Uster, Quartier 3". Empty when none is known.
 */
export const describeContact = (contact: Contact): string =>
  [describeContactFunktionen(contact), describeContactHof(contact), contact.description?.trim()]
    .filter((part): part is string => part !== undefined && part !== '')
    .join(' · ');

/** The letter a contact is listed under: the first of the name shown first, "#" for others. */
const letterOf = (name: string): string => {
  const first = name.trim().normalize('NFD').replaceAll(/[̀-ͯ]/g, '').charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : '#';
};

/**
 * Sorts contacts by the name shown first, the Ceviname or else the real name, and groups them
 * under its first letter, "Ä" under "A"; names starting otherwise go under "#" at the end.
 *
 * @param contacts - the contacts to list
 * @param nameOf - the name a contact is listed by
 * @param locale - the language the names are sorted in
 */
export const groupContactsByLetter = <T>(
  contacts: readonly T[],
  nameOf: (contact: T) => string,
  locale: string,
): { letter: string; contacts: T[] }[] => {
  const collator = new Intl.Collator(locale, { sensitivity: 'base' });
  const sorted = [...contacts].sort((a, b) => {
    const letterA = letterOf(nameOf(a));
    const letterB = letterOf(nameOf(b));
    if (letterA !== letterB) {
      if (letterA === '#') return 1;
      if (letterB === '#') return -1;
    }
    return collator.compare(nameOf(a), nameOf(b));
  });
  const groups: { letter: string; contacts: T[] }[] = [];
  for (const contact of sorted) {
    const letter = letterOf(nameOf(contact));
    const last = groups.at(-1);
    if (last?.letter === letter) last.contacts.push(contact);
    else groups.push({ letter, contacts: [contact] });
  }
  return groups;
};
