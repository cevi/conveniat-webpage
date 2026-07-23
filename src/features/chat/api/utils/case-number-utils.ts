/**
 * Utility functions for case numbers on alert messages / emergency chats.
 * Numbering schema: YYYY-MM-DD-XXX (e.g. 2026-06-01-001)
 */

export const formatCaseNumber = (
  caseNumber?: string | null,
  createdAt?: Date | string | null,
): string | undefined => {
  if (caseNumber !== undefined && caseNumber !== null && caseNumber !== '') {
    return caseNumber;
  }
  if (createdAt === undefined || createdAt === null) {
    return undefined;
  }
  const date = new Date(createdAt);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}-001`;
};
