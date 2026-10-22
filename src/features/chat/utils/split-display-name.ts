/** A person's name as a list shows it: the Ceviname first, the real name after it. */
export interface SplitDisplayName {
  /** the Ceviname, or the real name for someone without one */
  primary: string;
  /** the real name next to a Ceviname; missing without one */
  secondary?: string;
}

/**
 * Splits a name formatted as "Vorname Nachname v/o Ceviname" so the Ceviname can lead in bold,
 * as people at camp know each other by it: "Anna Muster v/o Fuchs" gives "Fuchs" and
 * "Anna Muster". A name without "v/o" stays whole.
 */
export const splitDisplayName = (displayName: string): SplitDisplayName => {
  const match = /^(.*?)\s*\bv\/o\s+(.+)$/i.exec(displayName.trim());
  const realName = match?.[1]?.trim() ?? '';
  const ceviName = match?.[2]?.trim() ?? '';
  if (ceviName === '') return { primary: displayName.trim() };
  if (realName === '') return { primary: ceviName };
  return { primary: ceviName, secondary: realName };
};
