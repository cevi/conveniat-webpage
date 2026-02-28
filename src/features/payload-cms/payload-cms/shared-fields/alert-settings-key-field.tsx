import type { Field } from 'payload';

export const AlertSettingsNextKeyField: Field = {
  type: 'text',
  name: 'nextQuestionKey',
  localized: true,
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
};
