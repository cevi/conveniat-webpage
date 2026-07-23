/**
 * Utility functions for case numbers on alert messages / emergency chats.
 * Numbering schema: YYYY-MM-DD-XXX (e.g. 2026-06-01-001)
 */

export const formatCaseNumber = (caseNumber?: string | null): string | undefined => {
  if (caseNumber !== undefined && caseNumber !== null && caseNumber !== '') {
    return caseNumber;
  }
  return undefined;
};
