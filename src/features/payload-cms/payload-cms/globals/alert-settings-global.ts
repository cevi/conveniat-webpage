import type { GlobalConfig } from 'payload';

export const AlertSettingsGlobal: GlobalConfig = {
  slug: 'alert_settings',
  label: { en: 'Alert Settings', de: 'Alert Einstellungen', fr: 'Paramètres Alert' },
  access: {
    read: () => true,
  },
  admin: {
    group: {
      en: 'Backoffice App Features',
      de: 'Backoffice App Funktionen',
      fr: 'Fonctionnalités Backoffice',
    },
  },
  fields: [
    {
      name: 'questions',
      type: 'array',
      labels: {
        singular: { en: 'Question', de: 'Frage', fr: 'Question' },
        plural: { en: 'Questions', de: 'Fragen', fr: 'Questions' },
      },
      fields: [
        {
          name: 'question',
          type: 'text',
          localized: true,
          required: true,
          label: { en: 'Question text', de: 'Fragetext', fr: 'Texte de la question' },
        },
        {
          name: 'options',
          type: 'array',
          required: true,
          minRows: 2,
          maxRows: 5,
          labels: {
            singular: { en: 'Option', de: 'Option', fr: 'Option' },
            plural: { en: 'Options', de: 'Optionen', fr: 'Options' },
          },
          fields: [
            {
              name: 'option',
              type: 'text',
              localized: true,
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'finalResponseMessage',
      type: 'textarea',
      localized: true,
      required: true,
      label: {
        en: 'Final Response Message',
        de: 'Abschliessende Antwortnachricht',
        fr: 'Message de réponse final',
      },
    },
    {
      name: 'emergencyPhoneNumber',
      type: 'text',
      localized: true,
      required: true,
      label: {
        en: 'Emergency Phone Number',
        de: 'Notfall-Telefonnummer',
        fr: "Numéro de téléphone d'urgence",
      },
    },
  ],
};
