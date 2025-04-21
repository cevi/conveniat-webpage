import type { ReactNode } from 'react';

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
  return node
    ?.toString()
    .toLowerCase()
    .replaceAll(/\s/g, '-')
    .replaceAll(/[^a-z0-9-]/g, '');
};
