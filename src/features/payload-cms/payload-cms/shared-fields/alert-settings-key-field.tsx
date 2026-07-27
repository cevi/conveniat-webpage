import { extractStringKey } from '@/features/payload-cms/payload-cms/utils/extract-string-key';
import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import type { Field, TextFieldSingleValidation } from 'payload';

export const AlertSettingsNextKeyField: Field = {
  type: 'text',
  name: 'nextQuestionKey',
  localized: false,
  required: false,
  admin: {
    description: {
      en: 'Optional key to link to the next question.',
      de: 'Optionaler Schlüssel, um zur nächsten Frage zu verlinken.',
      fr: 'Clé optionnelle pour faire le lien vers la question suivante.',
    },
    components: {
      Field: '@/features/payload-cms/payload-cms/components/alert-settings-key-component',
    },
  },
  validate: ((
    value: string | string[] | null | undefined,
    options: Parameters<TextFieldSingleValidation>[1],
  ): true | string => {
    const valueString = extractStringKey(value);
    if (!valueString) {
      return true;
    }
    const { data, req } = options;
    const localeString = req.i18n.language;
    const dataTyped = data as { questions?: { key?: unknown }[] };
    const availableKeys = (dataTyped.questions ?? [])
      .map((q) => extractStringKey(q.key, localeString))
      .filter((k): k is string => k !== undefined);

    if (!availableKeys.includes(valueString)) {
      return getValidationMessage(localeString, {
        en: `Selected question key "${valueString}" does not exist in questions list`,
        de: `Der gewählte Frageschlüssel "${valueString}" existiert nicht in der Fragenliste`,
        fr: `La clé de question sélectionnée "${valueString}" n'existe pas dans la liste des questions`,
      });
    }
    return true;
  }) as TextFieldSingleValidation,
};
