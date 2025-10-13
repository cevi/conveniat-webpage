import type { ReactNode } from 'react';

export const replaceUmlautsAndAccents = (input: string): string => {
  return input
    .toLowerCase()
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('ß', 'ss')
    .replaceAll(/[éèêë]/g, 'e')
    .replaceAll(/[àâ]/g, 'a')
    .replaceAll(/[îï]/g, 'i')
    .replaceAll('ô', 'o')
    .replaceAll(/[ùû]/g, 'u')
    .replaceAll('ç', 'c');
};

/**
 * Converts a ReactNode to a string that can be used as an anchor reference.
 *
 * @example
 * - nodeToAnchorReference('Hello World') // 'hello-world'
 * - nodeToAnchorReference(<h1>Hello World</h1>) // 'hello-world'
 *
 * @param node - The ReactNode to convert
 * @returns {string | undefined} The anchor reference or undefined if the node is undefined
 */
export const nodeToAnchorReference = (node: ReactNode): string | undefined => {
  const string_ = node?.toString();
  if (string_ === undefined) return undefined;

  return replaceUmlautsAndAccents(string_)
    .replaceAll(/\s+/g, '-') // Replace spaces with hyphens
    .replaceAll(/[^a-z0-9-]/g, ''); // Remove non-alphanumerics (except hyphen)
};
