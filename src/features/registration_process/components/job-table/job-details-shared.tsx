import { JsonBlock } from '@/components/ui/json-block';
import React from 'react';

/**
 * Helper to display key-value pairs cleanly
 */
export const DetailRow: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
}> = ({ label, value, icon: Icon }) => (
  <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-3 last:border-0 dark:border-zinc-800">
    <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
      {Icon !== undefined && React.createElement(Icon, { className: 'h-3.5 w-3.5' })}
      <span>{label}</span>
    </div>
    <div className="text-right text-xs font-medium text-zinc-900 dark:text-zinc-100">{value}</div>
  </div>
);

/**
 * Component to flatten and display simple input objects
 */
export const InputViewer: React.FC<{ data: unknown }> = ({ data }) => {
  if (typeof data !== 'object' || data === null) {
    return <span className="text-zinc-500">{String(data)}</span>;
  }

  // If complex nested object, fallback to JSON block
  const isComplex = Object.values(data).some(
    (val) => typeof val === 'object' && val !== null && !Array.isArray(val),
  );

  if (isComplex) {
    return <JsonBlock data={data} className="mt-2 text-[10px]" />;
  }

  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      {Object.entries(data as Record<string, unknown>).map(([key, val]) => (
        <div key={key} className="flex justify-between py-1 text-xs first:pt-0 last:pb-0">
          <span className="font-medium text-zinc-500 capitalize">
            {key.replaceAll(/([A-Z])/g, ' $1').trim()}
          </span>
          <span className="font-mono text-zinc-900 dark:text-zinc-200">
            {typeof val === 'string' || typeof val === 'number' ? val : JSON.stringify(val)}
          </span>
        </div>
      ))}
    </div>
  );
};
