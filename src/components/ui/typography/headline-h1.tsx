import { nodeToAnchorReference } from '@/utils/node-to-anchor-reference';
import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

export const HeadlineH1: React.FC<{
  children?: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <h1
      id={nodeToAnchorReference(children)}
      className={cn(
        'font-heading text-conveniat-green mb-4 mt-6 max-w-4xl hyphens-auto text-balance pt-8 text-3xl font-extrabold md:pt-20',
        className,
      )}
    >
      {children}
    </h1>
  );
};
