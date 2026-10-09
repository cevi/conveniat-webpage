import 'server-only';

import { environmentVariables } from '@/config/environment-variables';
import * as jwt from 'jsonwebtoken';

export const generatePreviewToken = async (
  id: string,
  expiresIn: number = 86_400,
): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!id) return reject(new Error('Preview ID cannot be empty'));
    const JWT_SECRET_KEY = environmentVariables.JWT_SECRET;
    resolve(jwt.sign({ id }, JWT_SECRET_KEY, { expiresIn: expiresIn }));
  });

/**
 * Reads the id a preview token was minted for: a document, or one stored version of a page.
 *
 * The id comes out of the signed token and nowhere else, so the caller can hold it against what
 * it is about to render. Comparing it with an id taken from the request would only prove that
 * the request agrees with itself.
 *
 * @param token - The `preview-token` or `preview-version-token` of a preview link.
 * @returns The id, or undefined if the token is forged, expired or malformed.
 */
export const getPreviewTokenId = (token: string): string | undefined => {
  try {
    const decoded = jwt.verify(token, environmentVariables.JWT_SECRET);
    if (typeof decoded === 'string') return undefined;

    const id: unknown = decoded['id'];
    return typeof id === 'string' && id !== '' ? id : undefined;
  } catch {
    return undefined;
  }
};
