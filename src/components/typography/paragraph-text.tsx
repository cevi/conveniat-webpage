import React from 'react';
import { cn } from '@/utils/tailwindcss-override';

export const ParagraphText: React.FC<{
  children?: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <p className={cn("my-2 max-w-2xl text-left font-body text-base font-normal text-gray-500", className)}>
      {children}
    </p>
  );
};
