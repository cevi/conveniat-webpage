/**
 * The Abteilung a registration belongs to, from the name of its Cevi.DB event. Every Abteilung
 * registers through an event of its own called `Hauptlager conveniat27 - <Abteilung>`, so what
 * follows the first ` - ` names it. An event that does not follow the pattern keeps its whole
 * name rather than being cut on a guess; one without a name has no Abteilung.
 *
 * The billing collections decode the HTML entities Cevi.DB leaves in stored names on read, see
 * `decodeStoredEventName`, so a name read through Payload is plain text already.
 */
export const abteilungOfEventName = (eventName: string | null | undefined): string | null => {
  const name = (eventName ?? '').trim();
  if (name === '') return null;
  const separator = name.indexOf(' - ');
  if (separator === -1) return name;
  const tail = name.slice(separator + 3).trim();
  return tail === '' ? name : tail;
};
