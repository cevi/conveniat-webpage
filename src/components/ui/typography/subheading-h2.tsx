import { nodeToAnchorReference } from '@/utils/node-to-anchor-reference';
import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

export const SubheadingH2: React.FC<{
  children?: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <h2
      id={nodeToAnchorReference(children)}
      className={cn(
        'font-heading text-conveniat-green mt-8 mb-2 max-w-4xl text-lg font-extrabold text-balance',
        className,
      )}
    >
      {children}
    </h2>
  );
};
