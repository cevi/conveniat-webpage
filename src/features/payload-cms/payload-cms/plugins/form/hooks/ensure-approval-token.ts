import { randomUUID } from 'node:crypto';
import type { CollectionBeforeChangeHook } from 'payload';

/**
 * Ensures every form submission has a unique pre-signed approvalToken.
 * Preserves existing approvalToken on updates if originalDoc already has one.
 *
 * Anyone may create a submission, so on create the token is always the server's own: one the
 * sender chose would let them approve their own submission.
 */
export const ensureApprovalToken: CollectionBeforeChangeHook = ({
  data,
  originalDoc: originalDocument,
  operation,
}) => {
  if (operation === 'create') {
    (data as { approvalToken?: string }).approvalToken = randomUUID();
    return data;
  }

  const existingToken = (data as { approvalToken?: unknown }).approvalToken;
  if (typeof existingToken === 'string' && existingToken.length > 0) {
    return data;
  }

  const originalToken = (originalDocument as { approvalToken?: unknown } | undefined)
    ?.approvalToken;
  if (typeof originalToken === 'string' && originalToken.length > 0) {
    (data as { approvalToken?: string }).approvalToken = originalToken;
  } else {
    (data as { approvalToken?: string }).approvalToken = randomUUID();
  }

  return data;
};
