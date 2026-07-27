'use client';

import { extractStringKey } from '@/features/payload-cms/payload-cms/utils/extract-string-key';
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
    .map(([, field]) => extractStringKey(field.value, locale.code))
    .filter((k): k is string => k !== undefined);

  const currentValue = extractStringKey(value, locale.code) ?? '';
  const isDangling = currentValue !== '' && !questionKeys.includes(currentValue);
  const availableKeys = isDangling ? [...questionKeys, currentValue] : questionKeys;

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
        ...availableKeys.map((key) => ({
          label: key === currentValue && isDangling ? `${key} (Invalid / Ungültig)` : key,
          value: key,
        })),
      ]}
      value={currentValue}
      onChange={onChange}
    />
  );
};

export default AlertSettingsKeyComponent;
