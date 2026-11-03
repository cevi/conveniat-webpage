import { nodeToAnchorReference } from '@/utils/node-to-anchor-reference';
import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

export const HeadlineH1: React.FC<{
  children?: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLHeadingElement>;
}> = ({ children, className, onClick }) => {
  return (
    <h1
      id={nodeToAnchorReference(children)}
      onClick={onClick}
      className={cn(
        'font-heading text-conveniat-green mt-6 mb-4 max-w-4xl pt-8 text-3xl font-extrabold text-balance hyphens-auto md:pt-20',
        // below a page's bar, or the place held for it, which already keeps the room under the
        // header (page-bar.tsx)
        'in-[main:has([data-page-bar],[data-page-bar-pending])]:mt-0 in-[main:has([data-page-bar],[data-page-bar-pending])]:pt-0 in-[main:has([data-page-bar],[data-page-bar-pending])]:md:pt-0',
        className,
      )}
    >
      {children}
    </h1>
  );
};
