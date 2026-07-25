import type { Block } from 'payload';

export const heroSectionBlock: Block = {
  slug: 'heroSection',
  interfaceName: 'HeroSectionBlock',
  imageAltText: 'Hero Section Block',
  labels: {
    singular: {
      de: 'Hero-Bereich (Hauptbanner)',
      en: 'Hero Section',
      fr: 'Section Héros',
    },
    plural: {
      de: 'Hero-Bereiche',
      en: 'Hero Sections',
      fr: 'Sections Héros',
    },
  },
  fields: [
    {
      name: 'badge',
      type: 'text',
      label: {
        de: 'Badge (z.B. Lagerprogramm conveniat27)',
        en: 'Badge (e.g. Camp Program conveniat27)',
        fr: 'Badge (par ex. Programme du camp)',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: {
        de: 'Titel (H1)',
        en: 'Title (H1)',
        fr: 'Titre (H1)',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: {
        de: 'Beschreibungstext',
        en: 'Description Text',
        fr: 'Texte de description',
      },
    },
    {
      name: 'primaryCtaLabel',
      type: 'text',
      label: {
        de: 'Primärer Button Text',
        en: 'Primary Button Label',
        fr: 'Texte du bouton principal',
      },
    },
    {
      name: 'primaryCtaLink',
      type: 'text',
      label: {
        de: 'Primärer Button Link / Anker (#id oder /url)',
        en: 'Primary Button Link / Anchor (#id or /url)',
        fr: 'Lien du bouton principal',
      },
    },
    {
      name: 'secondaryCtaLabel',
      type: 'text',
      label: {
        de: 'Sekundärer Button Text',
        en: 'Secondary Button Label',
        fr: 'Texte du bouton secondaire',
      },
    },
    {
      name: 'secondaryCtaLink',
      type: 'text',
      label: {
        de: 'Sekundärer Button Link / Anker (#id oder /url)',
        en: 'Secondary Button Link / Anchor (#id or /url)',
        fr: 'Lien du bouton secondaire',
      },
    },
    {
      name: 'deadlineText',
      type: 'text',
      label: {
        de: 'Anmeldeschluss / Frist Hinweis',
        en: 'Deadline / Notice Text',
        fr: 'Date limite / Notice',
      },
    },
    {
      name: 'image',
      type: 'relationship',
      relationTo: 'images',
      required: false,
      label: {
        de: 'Hauptbild',
        en: 'Main Image',
        fr: 'Image principale',
      },
    },
  ],
};
