'use client';

import { useField } from '@payloadcms/ui';
import type { CheckboxFieldClientProps } from 'payload';
import React from 'react';

// Extend the props to include label which might not be strictly typed in client props for all versions but is passed
type ExtendedCheckboxProperties = CheckboxFieldClientProps & {
  label?: string | Record<string, string>;
};

export const FeatureFlagToggle: React.FC<ExtendedCheckboxProperties> = ({
  path,
  label: labelProperties,
  field,
}) => {
  const { value, setValue } = useField<boolean>({ path });

  // In Payload admin, label comes from field configuration
  // It can be a string or a localized object { en: '...', de: '...', fr: '...' }
  const fieldLabel = field.label;
  let label: string;

  if (typeof labelProperties === 'string') {
    label = labelProperties;
  } else if (typeof fieldLabel === 'string') {
    label = fieldLabel;
  } else if (typeof fieldLabel === 'object') {
    // Localized label object - pick 'en' as fallback or first available
    label = fieldLabel['en'] ?? Object.values(fieldLabel)[0] ?? field.name;
  } else {
    label = field.name;
  }

  return (
    <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
      <div className="space-y-0.5">
        <label className="text-base font-medium text-gray-900 dark:text-gray-100">{label}</label>
        {field.admin?.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {field.admin.description as string}{' '}
            {/* Casting to string as description can be complex */}
          </p>
        )}
      </div>
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(event_) => setValue(event_.target.checked)}
        className="h-6 w-11 rounded-full border-gray-300 transition-colors focus:ring-green-500"
        style={{ transform: 'scale(1.5)' }}
      />
    </div>
  );
};
