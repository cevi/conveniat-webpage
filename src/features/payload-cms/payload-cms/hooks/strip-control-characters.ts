import type { CollectionBeforeChangeHook, GlobalBeforeChangeHook } from 'payload';

/**
 * C0 and C1 control characters, minus tab, line feed and carriage return.
 *
 * Editors paste these in without ever seeing them — a copy out of Word or a PDF carries
 * characters like U+0002 along, and browsers draw them as a hex tofu box because no font
 * has a glyph for them. They never mean anything inside CMS content.
 */
// eslint-disable-next-line no-control-regex -- matching control characters is the point here
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/gu;

/**
 * Removes unrenderable control characters from a string.
 *
 * @param value the string to clean
 */
export const stripControlCharacters = (value: string): string =>
  value.replaceAll(CONTROL_CHARACTERS, '');

/**
 * Walks the incoming document and cleans every string in place, so that block and rich text
 * payloads are covered as well as top level fields. Mutates rather than clones, because the
 * data can carry values Payload expects back by reference, such as upload buffers.
 *
 * @param node the value to clean
 */
const stripControlCharactersInPlace = (node: unknown): void => {
  if (Array.isArray(node)) {
    for (const [index, item] of node.entries()) {
      if (typeof item === 'string') {
        node[index] = stripControlCharacters(item);
      } else {
        stripControlCharactersInPlace(item);
      }
    }
    return;
  }

  if (node === null || typeof node !== 'object') return;
  if (node instanceof Date || node instanceof ArrayBuffer || ArrayBuffer.isView(node)) return;

  const record = node as Record<string, unknown>;
  for (const [key, item] of Object.entries(record)) {
    if (typeof item === 'string') {
      record[key] = stripControlCharacters(item);
    } else {
      stripControlCharactersInPlace(item);
    }
  }
};

/**
 * Strips control characters from everything that is saved. Attached to every collection and
 * global by `stripControlCharactersPlugin`, so that content cannot reach the renderer with
 * characters the browser draws as a missing glyph box.
 */
export const stripControlCharactersFromData: CollectionBeforeChangeHook &
  GlobalBeforeChangeHook = ({ data }) => {
  stripControlCharactersInPlace(data);
  return data as Record<string, unknown>;
};
