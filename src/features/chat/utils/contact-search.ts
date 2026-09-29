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
