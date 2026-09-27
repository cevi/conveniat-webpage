import type { Contact } from '@/features/chat/api/queries/list-contacts';

/**
 * The Hof line under a contact, e.g. "Hof Süd · Quartier 2". Empty for someone at no Hof.
 *
 * Both lists are optional: a browser restores the contacts it cached before they existed.
 */
export const describeContactHof = (contact: Contact): string =>
  [(contact.hoefe ?? []).join(', '), (contact.quartiere ?? []).join(', ')]
    .filter((part) => part !== '')
    .join(' · ');

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
  ].some((text) => typeof text === 'string' && text.toLowerCase().includes(query));
};
