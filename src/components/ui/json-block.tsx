import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

interface JsonBlockProperties {
  data: unknown;
  className?: string;
}

export const JsonBlock: React.FC<JsonBlockProperties> = ({ data, className }) => {
  return (
    <pre
      className={cn(
        'overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-4 font-mono text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100',
        className,
      )}
    >
      {JSON.stringify(data, undefined, 2)}
    </pre>
  );
};
