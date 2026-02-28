'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { SelectInput, useAllFormFields, useField, useLocale } from '@payloadcms/ui';
import type { TextFieldClientComponent } from 'payload';
import { useEffect } from 'react';

const noSelectionText: StaticTranslationString = {
  en: 'Select a question key',
  de: 'Wähle einen Fragen-Schlüssel',
  fr: 'Sélectionnez une clé de question',
};

const AlertSettingsKeyComponent: TextFieldClientComponent = ({ path }) => {
  const [fields] = useAllFormFields();
  const { value, setValue } = useField({ path });
  const locale = useLocale();

  // parse out all question key values --> get questions.X.key.value
  const questionKeys = Object.entries(fields)
    .filter(
      ([fieldName]) =>
        fieldName.endsWith('key') &&
        fieldName.includes('questions') &&
        fieldName.split('.').length === 3,
    )
    .map(([, field]) => field.value)
    .filter((questionKey): questionKey is string => typeof questionKey === 'string'); // filter not set

  useEffect(() => {
    // if questionKeys does not include the current value, reset it to empty string
    // this happens when a key is renamed in the question array
    if (value && !questionKeys.includes(value as string)) {
      setValue('');
    }
  }, [questionKeys, value, setValue]);

  const onChange = (selectedOption: { value: unknown } | { value: unknown }[]) => {
    if (Array.isArray(selectedOption)) {
      setValue('');
    } else {
      setValue(selectedOption.value);
    }
  };

  return (
    <SelectInput
      name={path}
      path={path}
      label={noSelectionText[locale.code as Locale]}
      options={questionKeys.map((key) => ({ label: key, value: key }))}
      value={(value as string) || ''}
      onChange={onChange}
      localized
    />
  );
};

export default AlertSettingsKeyComponent;
