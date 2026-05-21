import { DSN_TIMEOUT_MS } from '@/features/payload-cms/payload-cms/components/smtp-results/constants';
import type { SmtpStatusType } from '@/features/payload-cms/payload-cms/components/smtp-results/types';

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

export const formatTimeDifference = (start: Date, end: Date): string => {
  const diffMs = Math.abs(end.getTime() - start.getTime());
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return `${diffSecs}s`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
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

export const parseSmtpStats = (
  cellData: unknown,
  createdAtString?: string,
): { smtpState: SmtpStatusType; smtpCount: number; dsnState: SmtpStatusType; dsnCount: number } => {
  let smtpSuccess = 0;
  let smtpErrors = 0;
  let dsnSuccess = 0;
  let dsnErrors = 0;

  let lastSmtpOverrideIndex = -1;
  let lastDsnOverrideIndex = -1;

  if (Array.isArray(cellData) && cellData.length > 0) {
    const resultsArray = cellData as unknown[];

    // 1. Scan for the last manual overrides of SMTP and DSN chronologically
    for (const [index, result] of resultsArray.entries()) {
      if (result === null || typeof result !== 'object') continue;

      const recordItem = result as Record<string, unknown>;
      if (isManualOverrideItem(recordItem)) {
        if (recordItem['bounceReport'] === true) {
          lastDsnOverrideIndex = index;
        } else {
          lastSmtpOverrideIndex = index;
        }
      }
    }

    // 2. Compute SMTP counts starting from the last SMTP override index
    for (const [index, result] of resultsArray.entries()) {
      if (index < lastSmtpOverrideIndex) continue;
      if (result === null || typeof result !== 'object') continue;

      const recordItem = result as Record<string, unknown>;
      const isBounce = recordItem['bounceReport'] === true;
      if (isBounce) continue;

      let hasError = false;
      if (recordItem['success'] === false) hasError = true;
      if (typeof recordItem['error'] === 'string' && recordItem['error'].length > 0)
        hasError = true;

      if (hasError) smtpErrors++;
      else smtpSuccess++;
    }

    // 3. Compute DSN counts starting from the last DSN override index
    for (const [index, result] of resultsArray.entries()) {
      if (index < lastDsnOverrideIndex) continue;
      if (result === null || typeof result !== 'object') continue;

      const recordItem = result as Record<string, unknown>;
      const isBounce = recordItem['bounceReport'] === true;
      if (!isBounce) continue;

      let hasError = false;
      if (recordItem['success'] === false) hasError = true;
      if (typeof recordItem['error'] === 'string' && recordItem['error'].length > 0)
        hasError = true;

      if (hasError) dsnErrors++;
      else dsnSuccess++;
    }
  }

  // Derive Box 1 (SMTP) State
  let smtpState: SmtpStatusType = 'empty';
  if (smtpErrors > 0) smtpState = 'error';
  else if (smtpSuccess > 0) smtpState = 'success';

  let timeElapsedMs = 0;
  if (typeof createdAtString === 'string' && createdAtString.length > 0) {
    const createdAtDate = new Date(createdAtString);
    if (!Number.isNaN(createdAtDate.getTime())) {
      timeElapsedMs = Date.now() - createdAtDate.getTime();
    }
  }

  const isDsnTimeout = timeElapsedMs > DSN_TIMEOUT_MS;

  // Derive Box 2 (DSN) State
  let dsnState: SmtpStatusType = 'empty';
  if (dsnErrors > 0) dsnState = 'error';
  else if (dsnSuccess > 0 && dsnSuccess >= smtpSuccess) dsnState = 'success';
  else if (smtpSuccess > 0 || smtpErrors > 0) {
    dsnState = isDsnTimeout ? 'error' : 'pending';
  }

  const smtpCount = smtpErrors > 0 ? smtpErrors : smtpSuccess;

  let dsnCount = 0;
  if (dsnErrors > 0) {
    dsnCount = dsnErrors;
  } else if (dsnState === 'pending') {
    dsnCount = smtpCount;
  } else {
    dsnCount = dsnSuccess;
  }

  return { smtpState, smtpCount, dsnState, dsnCount };
};
