import { randomUUID } from 'node:crypto';
import type { CollectionBeforeChangeHook } from 'payload';

/**
 * Ensures every form submission has a unique pre-signed approvalToken.
 */
export const ensureApprovalToken: CollectionBeforeChangeHook = ({ data }) => {
  const existingToken = (data as { approvalToken?: unknown }).approvalToken;
  if (typeof existingToken !== 'string' || existingToken.length === 0) {
    (data as { approvalToken?: string }).approvalToken = randomUUID();
  }
  return data;
};
