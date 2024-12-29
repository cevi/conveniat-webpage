import React from 'react';
import { nodeToAnchorReference } from '@/utils/node-to-anchor-reference';

export const SubheadingH2: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  return (
    <h2
      id={nodeToAnchorReference(children)}
      className="mb-2 mt-8 max-w-4xl text-balance font-heading text-lg font-extrabold text-conveniat-green"
    >
      {children}
    </h2>
  );
};
