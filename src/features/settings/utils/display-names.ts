/** How a person is addressed in the app, split out of what Cevi.DB sends. */
export interface DisplayNames {
  /** the Ceviname, "Fuchs"; undefined for somebody without one */
  ceviName: string | undefined;
  /** the real name without the Ceviname, "Anna Muster" */
  fullName: string;
  /** what the app greets them with: the Ceviname, or else the first name */
  callName: string;
}

/**
 * Splits a Cevi.DB name into the parts the app shows. The session's name may already carry the
 * Ceviname as "Anna Muster v/o Fuchs", and the separate nickname may be missing, empty or carry
 * its own "v/o", so both are read.
 */
export const displayNamesOf = (name: string, nickname?: string | null): DisplayNames => {
  const [realName = '', nameSuffix] = name.split(/\s*\bv\/o\s+/i);
  const fullName = realName.trim();
  const cleanNickname = (nickname ?? '').replace(/^\s*v\/o\s+/i, '').trim();
  const ceviNameCandidate = cleanNickname === '' ? (nameSuffix ?? '').trim() : cleanNickname;
  const ceviName = ceviNameCandidate === '' ? undefined : ceviNameCandidate;
  const firstName = fullName.split(/\s+/)[0] ?? '';
  return {
    ceviName,
    fullName: fullName === '' ? (ceviName ?? '') : fullName,
    callName: ceviName ?? firstName,
  };
};
