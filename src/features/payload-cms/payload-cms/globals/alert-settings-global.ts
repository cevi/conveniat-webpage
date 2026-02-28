import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { AlertSettingsNextKeyField } from '@/features/payload-cms/payload-cms/shared-fields/alert-settings-key-field';
import type { GlobalConfig } from 'payload';

export const AlertSettingsGlobal: GlobalConfig = {
  slug: 'alert_settings',
  label: { en: 'Alert Settings', de: 'Alert Einstellungen', fr: 'Paramètres Alert' },
  access: {
    read: () => true,
  },
  admin: {
    group: AdminPanelDashboardGroups.BackofficeAppFeatures,
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
          name: 'key',
          type: 'text',
          localized: true,
          required: false,
          label: { en: 'Question key', de: 'Frage Schlüssel', fr: 'Clé de question' },
          admin: {
            description: {
              en: 'Optional key to link from another question.',
              de: 'Optionaler Schlüssel, um von einer anderen Frage zu verlinken.',
              fr: 'Clé optionnelle pour faire le lien depuis une autre question.',
            },
          },
        },
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
            AlertSettingsNextKeyField,
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
