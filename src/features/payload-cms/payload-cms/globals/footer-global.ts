import { LinkField } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import { asLocalizedGlobal } from '@/features/payload-cms/payload-cms/utils/localized-global';
import type { GlobalConfig } from 'payload';

export const FooterGlobal: GlobalConfig = asLocalizedGlobal({
  slug: 'footer',
  label: {
    en: 'Footer',
    de: 'Fusszeile',
    fr: 'Pied de page',
  },
  fields: [
    {
      name: 'minimalFooterMenu',
      admin: {
        description: {
          de: 'Menueintrag im Dunklen bereich des Footers',
          en: 'Menu item in the dark area of the footer',
          fr: 'Élément de menu dans la zone sombre du pied de page',
        },
      },
      label: {
        en: 'Menu Item',
        de: 'Menüpunkt',
        fr: 'Élément de menu',
      },
      type: 'array',
      localized: true,
      fields: [
        {
          name: 'label',
          label: 'Label',
          type: 'text',
          required: true,
        },
        LinkField(),
      ],
    },

    {
      name: 'footerMenu',
      admin: {
        description: {
          de: 'Menüpunkt im hellen Bereich des Footers',
          en: 'Menu item in the light area of the footer',
          fr: 'Élément de menu dans la zone claire du pied de page',
        },
      },
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
    {
      name: 'socialLinks',
      type: 'group',
      label: {
        en: 'Social Links',
        de: 'Soziale Links',
        fr: 'Liens sociaux',
      },
      fields: [
        {
          name: 'instagram',
          type: 'text',
          label: 'Instagram',
          required: false,
        },
        {
          name: 'youtube',
          type: 'text',
          label: 'YouTube',
          required: false,
        },
      ],
    },
  ],
  admin: {
    description: {
      en: 'Settings for the footer',
      de: 'Einstellungen für die Fusszeile',
      fr: 'Paramètres pour le pied de page',
    },
  },
});
