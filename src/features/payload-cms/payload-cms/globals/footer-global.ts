import { LinkField } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import { flushPageCacheOnChangeGlobal } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import { asLocalizedGlobal } from '@/features/payload-cms/payload-cms/utils/localized-global';
import {
  createSponsorItemValidation,
  isSponsorMediaPresent,
  isSponsorNamePresent,
} from '@/features/payload-cms/payload-cms/utils/sponsor-validation';
import type { GlobalConfig } from 'payload';

const validateFooterSponsorItem = createSponsorItemValidation('logo');

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
          en: 'Up to 6 sponsors displayed in the footer (image logo or text name)',
          de: 'Bis zu 6 Sponsoren, die in der Fusszeile angezeigt werden (Bild-Logo oder Text-Name)',
          fr: "Jusqu'à 6 sponsors affichés dans le pied de page (logo image ou nom texte)",
        },
      },
      fields: [
        {
          name: 'logo',
          type: 'upload',
          relationTo: 'images',
          required: false,
          label: {
            en: 'Logo',
            de: 'Logo',
            fr: 'Logo',
          },
          admin: {
            condition: (_, siblingData) =>
              !isSponsorNamePresent(siblingData as Record<string, unknown>),
          },
          validate: validateFooterSponsorItem,
        },
        {
          name: 'name',
          type: 'text',
          required: false,
          label: {
            en: 'Name (Text sponsor)',
            de: 'Name (Text-Sponsor)',
            fr: 'Nom (Sponsor texte)',
          },
          admin: {
            description: {
              en: 'Name of the sponsor if no logo is selected',
              de: 'Name des Sponsors, falls kein Logo ausgewählt ist',
              fr: 'Nom du sponsor si aucun logo n’est sélectionné',
            },
            condition: (_, siblingData) =>
              !isSponsorMediaPresent(siblingData as Record<string, unknown>, 'logo'),
          },
          validate: validateFooterSponsorItem,
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
