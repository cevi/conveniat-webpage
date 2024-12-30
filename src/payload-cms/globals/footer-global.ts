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
      name: 'footerMenu',
      label: {
        en: 'Footer Menu Block',
        de: 'Fusszeilen-Menü-Block',
        fr: 'Menu du pied de page',
      },
      // we localize the entire footer menu not individual items
      localized: true,
      type: 'array',
      fields: [
        {
          name: 'menuSubTitle',
          label: {
            en: 'Menu Subtitle',
            de: 'Menü-Subtitel',
            fr: 'Sous-titre du menu',
          },
          type: 'text',
          required: true,
        },
        {
          name: 'menuItem',
          label: {
            en: 'Menu Item',
            de: 'Menüpunkt',
            fr: 'Élément de menu',
          },
          type: 'array',
          fields: [
            {
              name: 'label',
              label: {
                en: 'Label',
                de: 'Bezeichnung',
                fr: 'Libellé',
              },
              type: 'text',
              required: true,
            },
            {
              name: 'link',
              label: {
                en: 'Link',
                de: 'Link',
                fr: 'Lien',
              },
              type: 'text',
              required: false,
            },
          ],
        },
      ],
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
