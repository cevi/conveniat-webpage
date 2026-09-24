'use server';

import { getAdminSession } from '@/utils/is-admin-session';
import { generatePreviewToken } from '@/utils/preview-token';
import { createLogger } from '@/utils/server-logger';

const logger = createLogger('pages:preview');

const MAX_EXPIRY_SECONDS = 604_800; // 7 days
const FALLBACK_EXPIRY_SECONDS = 10_800; // 3 hours

/**
 * Mints a preview token for a document, for the share-preview QR code in the admin panel.
 *
 * This is a Server Action, so anyone can call it. Only editors who can open the
 * admin panel get a token, and the expiry is capped on the server.
 *
 * @param id - The ID of the document to preview.
 * @param expirySeconds - How long the token stays valid, at most 7 days.
 * @returns The signed preview token.
 * @throws Error if the caller cannot access the admin panel.
 */
export const createPreviewToken = async (id: string, expirySeconds: number): Promise<string> => {
  const session = await getAdminSession();
  if (session === undefined) {
    logger.warn('Refused to mint a preview token without an admin session');
    throw new Error('Unauthorized');
  }

  const expiresIn =
    Number.isInteger(expirySeconds) && expirySeconds > 0 && expirySeconds <= MAX_EXPIRY_SECONDS
      ? expirySeconds
      : FALLBACK_EXPIRY_SECONDS;

  logger.debug('Minted a preview token', { 'preview.id': id, 'preview.expires_in': expiresIn });
  return generatePreviewToken(id, expiresIn);
};
