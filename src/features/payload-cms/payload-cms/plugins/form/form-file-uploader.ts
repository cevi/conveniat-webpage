import { Cookie } from '@/types/types';
import { createHash, randomBytes } from 'node:crypto';
import type { Where } from 'payload';

/**
 * A temporary form file is claimed by a submission through its id alone, and ids are guessable,
 * so only the one who uploaded a file may restore or attach it. Someone signed in is known by
 * their user. Anyone else is known by their browser: the upload hands it a random secret in an
 * httpOnly cookie, and the file keeps only the secret's hash.
 */

interface UploaderRequest {
  user?: { id: string } | null;
  headers?: Headers;
}

/** The fields of a form file that name who uploaded it. */
interface UploadedFile {
  uploadedBy?: string | { id: string } | null;
  uploaderSecretHash?: string | null;
}

/** As long as an unclaimed upload is kept before the cleanup task deletes it. */
export const FORM_UPLOADER_COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60;

/** A new secret for a browser that uploads without being signed in. */
export const createUploaderSecret = (): string => randomBytes(32).toString('base64url');

/** The hash a form file stores of its anonymous uploader's secret. */
export const hashUploaderSecret = (secret: string): string =>
  createHash('sha256').update(secret).digest('hex');

/** The uploader secret the request's browser holds, if it ever uploaded anonymously. */
export const uploaderSecretOf = (request: UploaderRequest): string | undefined => {
  const prefix = `${Cookie.FORM_UPLOADER}=`;
  const secret = request.headers
    ?.get('cookie')
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
  return secret === undefined || secret === '' ? undefined : secret;
};

/**
 * Matches the form files the request's sender uploaded, by their user or by their browser's
 * secret, or `undefined` when the request names neither and so owns no file.
 */
export const uploadedBySenderWhere = (request: UploaderRequest): Where | undefined => {
  const conditions: Where[] = [];
  if (request.user) conditions.push({ uploadedBy: { equals: request.user.id } });
  const secret = uploaderSecretOf(request);
  if (secret !== undefined) {
    conditions.push({ uploaderSecretHash: { equals: hashUploaderSecret(secret) } });
  }
  return conditions.length <= 1 ? conditions[0] : { or: conditions };
};

/** Whether the request's sender uploaded the file, by their user or by their browser's secret. */
export const isUploadedBySender = (file: UploadedFile, request: UploaderRequest): boolean => {
  const uploaderId = typeof file.uploadedBy === 'object' ? file.uploadedBy?.id : file.uploadedBy;
  if (typeof uploaderId === 'string' && uploaderId === request.user?.id) return true;

  const secret = uploaderSecretOf(request);
  return (
    typeof file.uploaderSecretHash === 'string' &&
    secret !== undefined &&
    file.uploaderSecretHash === hashUploaderSecret(secret)
  );
};
