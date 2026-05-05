import { LinkField } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import { flushPageCacheOnChangeGlobal } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import { asLocalizedGlobal } from '@/features/payload-cms/payload-cms/utils/localized-global';
import type { GlobalConfig } from 'payload';

export const FooterGlobal: GlobalConfig = asLocalizedGlobal({
  slug: 'footer',
  hooks: { afterChange: [flushPageCacheOnChangeGlobal] },
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
    {
      name: 'sponsors',
      type: 'array',
      maxRows: 6,
      label: {
        en: 'Sponsors',
        de: 'Sponsoren',
        fr: 'Sponsors',
      },
      admin: {
        description: {
          en: 'Up to 6 sponsor logos displayed in the footer',
          de: 'Bis zu 6 Sponsoren-Logos, die in der Fusszeile angezeigt werden',
          fr: "Jusqu'à 6 logos de sponsors affichés dans le pied de page",
        },
      },
      fields: [
        {
          name: 'logo',
          type: 'upload',
          relationTo: 'images',
          required: true,
          label: {
            en: 'Logo',
            de: 'Logo',
            fr: 'Logo',
          },
        },
        LinkField(false),
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
