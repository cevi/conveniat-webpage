'use client';

import { formatSlug } from '@/features/payload-cms/payload-cms/components/slug/format-slug';
import type { CustomSlugComponentProperties } from '@/features/payload-cms/payload-cms/components/slug/types';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Locale } from '@/types/types';
import { FieldLabel, TextInput, useField, useFormFields, useLocale } from '@payloadcms/ui';
import { Lock, Unlock } from 'lucide-react';
import type { TextFieldClientProps } from 'payload';
import React, { useCallback, useEffect, useState } from 'react';

export const SlugComponent: React.FC<
  TextFieldClientProps & { collectionName: CustomSlugComponentProperties }
> = (properties) => {
  const { field, path, collectionName } = properties;
  const locale = useLocale();

  let collectionSlug = '';
  switch (locale.code) {
    case LOCALE.DE: {
      collectionSlug = collectionName.collectionSlugDE;

      break;
    }
    case LOCALE.EN: {
      collectionSlug = collectionName.collectionSlugEN;

      break;
    }
    case LOCALE.FR: {
      collectionSlug = collectionName.collectionSlugFR;

      break;
    }
    // No default
  }

  const { label } = field;
  const { value, setValue } = useField<string>({ path: path || 'seo.urlSlug' });

  const [checkboxValue, setCheckboxValue] = useState(true);

  const targetFieldValue = useFormFields(([fields]) => {
    return fields[path || 'seo.urlSlug']?.value as string;
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
      if (
        checkboxValue &&
        !globalThis.confirm(
          'Changing the slug will change the URL. Do you want to continue? This will break all links to that page.',
        )
      ) {
        return; // do not change the state
      }

      event.preventDefault();

      setCheckboxValue((previous) => !previous); // Update state instead of local variable
    },
    [checkboxValue],
  );

  const readOnly = checkboxValue;

  // TODO: this is wrong when a collection has multiple locale prefixes
  const prefix =
    `/${(locale.code as Locale) === LOCALE.DE ? '' : locale.code}/${collectionSlug}/`.replaceAll(
      /\/+/g,
      '/',
    );

  return (
    <div className="field-type slug-field-component space-y-2">
      <div className="flex items-center justify-between">
        <FieldLabel htmlFor={`field-${path}`} label={label ?? ''} />

        <button
          className="ml-2 p-1 text-gray-500 hover:text-gray-700 focus:outline-hidden dark:text-gray-200 dark:hover:text-gray-50"
          onClick={handleLock}
          aria-label={checkboxValue ? 'Unlock' : 'Lock'}
        >
          {checkboxValue ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
        </button>
      </div>

      <div className="mb-2 text-sm text-gray-500">
        {prefix}
        <span className="text-gray-700">{value}</span>
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
