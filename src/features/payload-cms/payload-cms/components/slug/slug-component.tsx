'use client';

import { FieldLabel, TextInput, useField, useFormFields } from '@payloadcms/ui';
import { Lock, Unlock } from 'lucide-react'; // Import icons from Lucide
import type { TextFieldClientProps } from 'payload';
import React, { useCallback, useEffect, useState } from 'react';
import { formatSlug } from './format-slug';

export const SlugComponent: React.FC<TextFieldClientProps> = ({ field, path }) => {
  const { label } = field;

  const { value, setValue } = useField<string>({ path: path || 'seo.urlSlug' });

  const [checkboxValue, setCheckboxValue] = useState(true);

  const targetFieldValue = useFormFields(([fields]) => {
    return fields['seo.urlSlug']?.value as string;
  });

  useEffect(() => {
    if (!checkboxValue) {
      if (targetFieldValue) {
        const formattedSlug = formatSlug(targetFieldValue);

        if (value !== formattedSlug) setValue(formattedSlug);
      } else {
        if (value !== '') setValue('');
      }
    }
  }, [targetFieldValue, checkboxValue, setValue, value]);

  const handleLock = useCallback(
    (event: { preventDefault: () => void }) => {
      event.preventDefault();

      setCheckboxValue((previous) => !previous); // Update state instead of local variable
    },
    [setCheckboxValue],
  );

  const readOnly = checkboxValue;

  return (
    <div className="field-type slug-field-component space-y-2">
      <div className="flex items-center justify-between">
        <FieldLabel htmlFor={`field-${path}`} label={label ?? ''} />

        <button
          className="ml-2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
          onClick={handleLock}
          aria-label={checkboxValue ? 'Unlock' : 'Lock'}
        >
          {checkboxValue ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
        </button>
      </div>

      <TextInput
        value={value}
        onChange={setValue}
        path={path || field.name}
        readOnly={Boolean(readOnly)}
        className=""
      />
    </div>
  );
};
