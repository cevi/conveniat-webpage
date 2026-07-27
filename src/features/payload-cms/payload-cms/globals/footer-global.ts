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

const appNavBarIconOptions = [
  {
    label: {
      en: 'Chats (MessageSquare)',
      de: 'Chats (MessageSquare)',
      fr: 'Chats (MessageSquare)',
    },
    value: 'MessageSquare',
  },
  {
    label: { en: 'Emergency (Siren)', de: 'Notfall (Siren)', fr: 'Urgence (Siren)' },
    value: 'Siren',
  },
  {
    label: { en: 'Home (House)', de: 'Home (House)', fr: 'Accueil (House)' },
    value: 'House',
  },
  {
    label: { en: 'Map (MapIcon)', de: 'Karte (MapIcon)', fr: 'Carte (MapIcon)' },
    value: 'MapIcon',
  },
  {
    label: { en: 'Program (Calendar)', de: 'Programm (Calendar)', fr: 'Programme (Calendar)' },
    value: 'Calendar',
  },
  {
    label: { en: 'Users / Group', de: 'Personen / Gruppe', fr: 'Utilisateurs / Groupe' },
    value: 'Users',
  },
  {
    label: { en: 'Settings', de: 'Einstellungen', fr: 'Paramètres' },
    value: 'Settings',
  },
  {
    label: { en: 'Info', de: 'Information', fr: 'Information' },
    value: 'Info',
  },
  {
    label: { en: 'Bell / Notifications', de: 'Glocke / Mitteilungen', fr: 'Notifications' },
    value: 'Bell',
  },
  {
    label: { en: 'Compass', de: 'Kompass', fr: 'Boussole' },
    value: 'Compass',
  },
  {
    label: { en: 'Map Pin', de: 'Kartenstecknadel', fr: 'Repère' },
    value: 'MapPin',
  },
  {
    label: { en: 'Tent', de: 'Zelt', fr: 'Tente' },
    value: 'Tent',
  },
  {
    label: { en: 'Utensils / Food', de: 'Essen / Verpflegung', fr: 'Nourriture' },
    value: 'Utensils',
  },
  {
    label: { en: 'Flag', de: 'Flagge', fr: 'Drapeau' },
    value: 'Flag',
  },
  {
    label: { en: 'Help', de: 'Hilfe', fr: 'Aide' },
    value: 'HelpCircle',
  },
  {
    label: { en: 'Phone / Contact', de: 'Telefon / Kontakt', fr: 'Contact' },
    value: 'Phone',
  },
  {
    label: { en: 'Shield / Safety', de: 'Sonderdienst / Schutz', fr: 'Sécurité' },
    value: 'Shield',
  },
  {
    label: { en: 'Check / Tasks', de: 'Aufgaben', fr: 'Tâches' },
    value: 'CheckSquare',
  },
  {
    label: { en: 'List', de: 'Liste', fr: 'Liste' },
    value: 'List',
  },
  {
    label: { en: 'Medical', de: 'Sanität / Medizin', fr: 'Médical' },
    value: 'BriefcaseMedical',
  },
  {
    label: { en: 'Radio / News', de: 'Funk / News', fr: 'Radio' },
    value: 'Radio',
  },
  {
    label: { en: 'Sparkles', de: 'Highlights', fr: 'Points forts' },
    value: 'Sparkles',
  },
  {
    label: { en: 'Heart / Favorites', de: 'Favoriten', fr: 'Favoris' },
    value: 'Heart',
  },
];

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
      name: 'appNavBarMenu',
      label: {
        en: 'App Bottom Navigation Bar',
        de: 'App Untere Navigationsleiste (App Bar)',
        fr: 'Barre de navigation inférieure (App Bar)',
      },
      admin: {
        description: {
          en: 'Menu items displayed in the app bottom navigation bar. If empty, the default menu items (Chats, Emergency, Home, Map, Program) are used.',
          de: 'Menüeinträge für die untere Navigationsleiste der App. Wenn leer, werden die Standard-Menüeinträge (Chats, Notfall, Home, Karte, Programm) verwendet.',
          fr: 'Éléments de menu affichés dans la barre de navigation inférieure. Si vide, les éléments par défaut sont utilisés.',
        },
      },
      type: 'array',
      localized: true,
      fields: [
        {
          name: 'label',
          label: { en: 'Label', de: 'Beschriftung', fr: 'Libellé' },
          type: 'text',
          required: true,
        },
        {
          name: 'icon',
          label: 'Icon',
          type: 'select',
          required: true,
          defaultValue: 'House',
          options: appNavBarIconOptions,
          admin: {
            components: {
              Field: '@/features/payload-cms/payload-cms/components/fields/icon-select-field',
            },
          },
        },
        {
          name: 'href',
          label: { en: 'Link / Path', de: 'Link / Pfad', fr: 'Lien / Chemin' },
          type: 'text',
          required: true,
          admin: {
            description: {
              en: 'Target path or URL (e.g. /app/chat, /app/emergency, /app/dashboard, /app/map, /app/schedule).',
              de: 'Zielpfad oder URL (z. B. /app/chat, /app/emergency, /app/dashboard, /app/map, /app/schedule).',
              fr: 'Chemin cible ou URL (par ex. /app/chat, /app/emergency, /app/dashboard, /app/map, /app/schedule).',
            },
          },
        },
        {
          name: 'color',
          label: { en: 'Highlight Color', de: 'Hervorhebungsfarbe', fr: 'Couleur' },
          type: 'select',
          defaultValue: 'default',
          options: [
            { label: { en: 'Default', de: 'Standard', fr: 'Par défaut' }, value: 'default' },
            {
              label: {
                en: 'Red (Emergency / Warning)',
                de: 'Rot (Notfall / Warnung)',
                fr: 'Rouge (Urgence)',
              },
              value: 'red',
            },
            { label: { en: 'Green', de: 'Grün', fr: 'Vert' }, value: 'green' },
          ],
        },
      ],
    },
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
