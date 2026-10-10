/**
 * Extracts the email address from a potentially formatted string like:
 * "Name" <email@domain.com>
 * @param email - The email string to parse.
 * @returns The extracted email address or the original string.
 */
export const extractEmailAddress = (email: string): string => {
  const trimmed = email.trim();
  const hasBrackets = trimmed.includes('<') || trimmed.includes('>');

  if (hasBrackets) {
    const match = trimmed.match(/<([^>]+)>$/);
    const extracted = match?.[1];

    if (typeof extracted === 'string' && extracted.length > 0) {
      return extracted.trim();
    }
    // malformed bracketed email
    return '';
  }

  return trimmed;
};

export const isSystemEmail = (email: string, systemEmails: string[] = []): boolean => {
  if (email.length === 0) return false;
  const norm = email.toLowerCase().trim();

  if (systemEmails.some((sys) => sys.toLowerCase() === norm)) {
    return true;
  }

  const localPart = norm.split('@')[0];
  return localPart === 'noreply' || localPart === 'no-reply' || localPart === 'postmaster';
};

export type SimplifiedRejectionKey =
  | 'rejectionUserUnknown'
  | 'rejectionDomainNotFound'
  | 'rejectionMailboxFull'
  | 'rejectionSpamPolicy'
  | 'rejectionGeneric'
  | undefined;

export const parseSimplifiedRejectionReason = (
  status?: string,
  diagnosticCode?: string,
): SimplifiedRejectionKey => {
  const diagLower = (diagnosticCode ?? '').toLowerCase();

  // Reference for DSN codes: RFC 3463
  if (
    status?.startsWith('5.1.1') === true ||
    diagLower.includes('user unknown') ||
    diagLower.includes('does not exist')
  ) {
    return 'rejectionUserUnknown';
  }

  if (
    status?.startsWith('5.1.2') === true ||
    status?.startsWith('4.4.4') === true ||
    status?.startsWith('5.4.4') === true ||
    diagLower.includes('domain not found') ||
    diagLower.includes('nullmx') ||
    diagLower.includes('no answer from host')
  ) {
    return 'rejectionDomainNotFound';
  }

  if (
    status?.startsWith('5.2.2') === true ||
    diagLower.includes('quota exceeded') ||
    diagLower.includes('mailbox full')
  ) {
    return 'rejectionMailboxFull';
  }

  if (
    status?.startsWith('5.7.1') === true ||
    diagLower.includes('spam') ||
    diagLower.includes('blocked') ||
    diagLower.includes('blacklisted') ||
    diagLower.includes('policy')
  ) {
    return 'rejectionSpamPolicy';
  }

  return (typeof diagnosticCode === 'string' && diagnosticCode.length > 0) ||
    (typeof status === 'string' && status.length > 0)
    ? 'rejectionGeneric'
    : undefined;
};

export const isManualOverrideItem = (r: Record<string, unknown>): boolean => {
  if (r['manualOverride'] === true) return true;

  // Backward compatibility check for existing records in DB
  const hasRetriggered = r['retriggeredBy'] !== undefined;

  const responseObject = r['response'] as Record<string, unknown> | undefined;
  const responseString = responseObject?.['response'] as string | undefined;
  const isManualText =
    typeof responseString === 'string' &&
    (responseString.includes('manually set to') || responseString.includes('manually marked as'));

  const parsedDsnObject = r['parsedDsn'] as Record<string, unknown> | undefined;
  const diagnosticCode = parsedDsnObject?.['diagnosticCode'] as string | undefined;
  const isDsnManualText =
    typeof diagnosticCode === 'string' &&
    (diagnosticCode.includes('Manually marked as') || diagnosticCode.includes('manually set to'));

  return hasRetriggered && (isManualText || isDsnManualText);
};
