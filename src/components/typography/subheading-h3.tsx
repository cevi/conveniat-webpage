import React from 'react';
import { nodeToAnchorReference } from '@/utils/node-to-anchor-reference';

export const SubheadingH3: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  return (
    <h3
      id={nodeToAnchorReference(children)}
      className="mb-1 mt-8 max-w-4xl text-balance font-heading text-base font-extrabold text-conveniat-green"
    >
      {children}
    </h3>
  );
};
