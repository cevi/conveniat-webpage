import { nodeToAnchorReference } from '@/utils/node-to-anchor-reference';
import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

export const SubheadingH3: React.FC<{
  children?: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <h3
      id={nodeToAnchorReference(children)}
      className={cn(
        'font-heading text-conveniat-green mt-8 mb-1 max-w-4xl text-base font-extrabold text-balance',
        className,
      )}
    >
      {children}
    </h3>
  );
};
