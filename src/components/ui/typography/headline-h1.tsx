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
        'font-heading text-conveniat-green mt-4 mb-4 max-w-4xl text-3xl font-extrabold text-balance hyphens-auto',
        className,
      )}
    >
      {children}
    </h1>
  );
};
