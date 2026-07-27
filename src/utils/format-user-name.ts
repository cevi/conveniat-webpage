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

/**
 * Returns a short display name for a contact in pill/selected lists.
 * Uses the Ceviname/nickname if available (without "v/o " prefix),
 * falling back to the user's first name if not available.
 */
export function getContactShortName(contact: {
  name: string;
  nickname?: string | null | undefined;
}): string {
  const rawNickname = contact.nickname?.trim() ?? '';
  if (rawNickname.length > 0) {
    const cleanNickname = rawNickname.replace(/^(v\/o\s+)/i, '').trim();
    if (cleanNickname.length > 0) {
      return cleanNickname;
    }
  }
  const firstName = contact.name.split(' ')[0];
  return firstName !== undefined && firstName.trim().length > 0 ? firstName : contact.name;
}
