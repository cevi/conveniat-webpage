import { ReactDOMServer } from 'next/dist/server/route-modules/app-page/vendored/ssr/entrypoints';
import type { ReactNode } from 'react';

export const replaceUmlautsAndAccents = (input: string | undefined | null): string => {
  // while creating a new page in the payload cms admin panel
  // the input may be undefined or null, after publishing the page
  // this should no longer be the case
  if (input === undefined || input === null) return '';
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
  const stringifiedNode = ReactDOMServer.renderToString(node);
  if (stringifiedNode === '') return undefined;

  return replaceUmlautsAndAccents(stringifiedNode)
    .replaceAll(/\s+/g, '-') // Replace spaces with hyphens
    .replaceAll(/[^a-z0-9-]/g, ''); // Remove non-alphanumerics (except hyphen)
};
