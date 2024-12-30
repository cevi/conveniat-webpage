import { ReactNode } from 'react';

export const nodeToAnchorReference = (node: ReactNode): string | undefined => {
  return node
    ?.toString()
    .toLowerCase()
    .replaceAll(/\s/g, '-')
    .replaceAll(/[^a-z0-9-]/g, '');
};
