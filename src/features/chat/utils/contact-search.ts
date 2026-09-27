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

/** Whether a contact matches the address book search, by name, nickname, description or Hof. */
export const matchesContactSearch = (contact: Contact, search: string): boolean => {
  const query = search.toLowerCase().trim();
  if (query === '') return true;
  return [
    contact.name,
    contact.nickname,
    contact.description,
    ...(contact.hoefe ?? []),
    ...(contact.quartiere ?? []),
  ].some((text) => typeof text === 'string' && text.toLowerCase().includes(query));
};
