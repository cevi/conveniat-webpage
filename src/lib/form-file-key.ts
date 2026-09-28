import { randomUUID } from 'node:crypto';
import path from 'node:path';

/** A key `formFileKey` made: a random UUID and, if the name had one, its extension. */
const FORM_FILE_KEY = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}(?:\.[\da-z]+)?$/;

/**
 * The object key a form file is stored under: random, so no sender picks the key of another
 * object, and with the extension of the name it was handed in with, so the upload checks that
 * go by extension still see it.
 */
export const formFileKey = (fileName: string): string => {
  const extension = path
    .extname(fileName)
    .toLowerCase()
    .replaceAll(/[^\d.a-z]/g, '');
  return `${randomUUID()}${extension === '.' ? '' : extension}`;
};

/** Whether a stored filename is a key `formFileKey` made, rather than a name a sender chose. */
export const isFormFileKey = (filename: string): boolean => FORM_FILE_KEY.test(filename);
