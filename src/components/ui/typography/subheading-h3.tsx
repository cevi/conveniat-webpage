import React from 'react';
import { nodeToAnchorReference } from '@/utils/node-to-anchor-reference';
import { cn } from '@/utils/tailwindcss-override';

export const SubheadingH3: React.FC<{
  children?: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <h3
      id={nodeToAnchorReference(children)}
      className={cn(
        'mb-1 mt-8 max-w-4xl text-balance font-heading text-base font-extrabold text-conveniat-green',
        className,
      )}
    >
      {children}
    </h3>
  );
};
