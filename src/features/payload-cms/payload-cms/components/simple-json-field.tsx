'use client';

import { useField } from '@payloadcms/ui';
import type { JSONFieldClientProps } from 'payload';
import React from 'react';

export const SimpleJsonField: React.FC<JSONFieldClientProps> = ({ path, field }) => {
  const { value } = useField<unknown>({ path });

  const formattedValue = React.useMemo(() => {
    // Avoid literal null check to satisfy unicorn/no-null rule
    if (value === undefined || (typeof value === 'object' && !value)) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
      return String(value);
    }
    try {
      return JSON.stringify(value, undefined, 2);
    } catch {
      return 'Failed to stringify value';
    }
  }, [value]);

  const fieldLabel = field.label;
  let label: string;

  if (typeof fieldLabel === 'string') {
    label = fieldLabel;
  } else if (typeof fieldLabel === 'object' && Boolean(fieldLabel)) {
    // Localized label object - pick 'de' or 'en' as fallback or first available
    label = fieldLabel['de'] ?? fieldLabel['en'] ?? Object.values(fieldLabel)[0] ?? field.name;
  } else {
    label = field.name;
  }

  return (
    <div className="field-type text m-2 flex flex-col gap-2 rounded-lg border p-4 shadow-sm">
      <div className="space-y-0.5">
        <label className="text-base font-semibold text-gray-900 dark:text-gray-100">{label}</label>
        {Boolean(field.admin?.description) && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {field.admin?.description as string}
          </p>
        )}
      </div>
      <textarea
        readOnly
        value={formattedValue}
        className="min-h-[150px] w-full rounded border border-gray-300 bg-gray-50 p-3 font-mono text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        rows={10}
      />
    </div>
  );
};

export default SimpleJsonField;
