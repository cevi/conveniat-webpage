import { GlobalConfig } from 'payload';

export const DataPrivacyStatement: GlobalConfig = {
  slug: 'data-privacy-statement',
  label: {
    en: 'Data Privacy Statement',
    de: 'Datenschutzerklärung',
    fr: 'Déclaration de confidentialité',
  },
  fields: [],
  admin: {
    group: 'Unique Content',
    description: {
      en: 'Settings for the data privacy statement',
      de: 'Einstellungen für die Datenschutzerklärung',
      fr: 'Paramètres pour la déclaration de confidentialité',
    },
  },
};
