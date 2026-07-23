/**
 * Formats a user's full name together with their Cevi-Name (nickname) if present.
 * Example: "Max Mustermann" + "Musterli" -> "Max Mustermann v/o Musterli"
 */
export function formatUserFullName(fullName?: string | null, nickname?: string | null): string {
  const cleanFullName = fullName?.trim() ?? '';
  const cleanNickname = nickname?.trim() ?? '';

  if (!cleanNickname) {
    return cleanFullName;
  }

  const formattedNickname = cleanNickname.toLowerCase().startsWith('v/o ')
    ? cleanNickname
    : `v/o ${cleanNickname}`;

  if (!cleanFullName) {
    return formattedNickname;
  }

  return `${cleanFullName} ${formattedNickname}`;
}
