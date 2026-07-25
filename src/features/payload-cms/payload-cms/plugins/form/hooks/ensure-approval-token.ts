import { randomUUID } from 'node:crypto';
import type { CollectionBeforeChangeHook } from 'payload';

/**
 * Ensures every form submission has a unique pre-signed approvalToken.
 * Preserves existing approvalToken on updates if originalDoc already has one.
 */
export const ensureApprovalToken: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const existingToken = (data as { approvalToken?: unknown }).approvalToken;
  if (typeof existingToken === 'string' && existingToken.length > 0) {
    return data;
  }

  const originalToken = (originalDoc as { approvalToken?: unknown } | undefined)?.approvalToken;
  if (typeof originalToken === 'string' && originalToken.length > 0) {
    (data as { approvalToken?: string }).approvalToken = originalToken;
  } else {
    (data as { approvalToken?: string }).approvalToken = randomUUID();
  }

  return data;
};
