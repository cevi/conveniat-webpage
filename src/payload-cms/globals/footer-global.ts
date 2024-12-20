import { GlobalConfig } from 'payload';
import { AdminPanelDashboardGroups } from '@/payload-cms/admin-panel-dashboard-groups';

export const FooterGlobal: GlobalConfig = {
  slug: 'footer',
  label: {
    en: 'Footer',
    de: 'Fusszeile',
    fr: 'Pied de page',
  },
  fields: [
    {
      name: 'donationIban',
      label: 'Spenden IBAN',
      type: 'text',
      defaultValue: 'CH23 8080 8002 2706 7598 8',
      required: true,
    },
  ],
  admin: {
    group: AdminPanelDashboardGroups.GlobalSettings,
    description: {
      en: 'Settings for the footer',
      de: 'Einstellungen für die Fusszeile',
      fr: 'Paramètres pour le pied de page',
    },
  },
};
