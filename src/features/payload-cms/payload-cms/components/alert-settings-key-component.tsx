'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { SelectInput, useAllFormFields, useField, useLocale } from '@payloadcms/ui';
import type { TextFieldClientComponent } from 'payload';

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
    .filter((questionKey): questionKey is string => {
      if (typeof questionKey !== 'string') {
        return false;
      }
      return questionKey.trim().length > 0;
    }); // filter out non-string and empty/whitespace-only keys

  const currentValue = typeof value === 'string' ? value : '';
  const availableKeys =
    currentValue && !questionKeys.includes(currentValue)
      ? [...questionKeys, currentValue]
      : questionKeys;

  const onChange = (selectedOption: { value: unknown } | { value: unknown }[]): void => {
    if (Array.isArray(selectedOption)) {
      setValue('');
    } else {
      setValue(selectedOption.value ?? '');
    }
  };

  return (
    <SelectInput
      name={path}
      path={path}
      label={noSelectionText[locale.code as Locale]}
      options={[
        { label: noSelectionText[locale.code as Locale], value: '' },
        ...availableKeys.map((key) => ({ label: key, value: key })),
      ]}
      value={currentValue}
      onChange={onChange}
    />
  );
};

export default AlertSettingsKeyComponent;
