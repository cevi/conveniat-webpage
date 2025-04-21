import type { Field } from 'payload';
import { blogArticleTitleValidation } from '@/features/payload-cms/settings/collections/blog-article/validation';

export const blogArticleTitleField: Field = {
  name: 'blogH1',
  label: {
    en: 'Title',
    de: 'Titel',
    fr: 'Titre',
  },
  type: 'text',
  localized: true,
  required: true,
  admin: {
    description: {
      en: 'This is the title that will be displayed on the page.',
      de: 'Dies ist der Titel, der auf der Seite angezeigt wird.',
      fr: "C'est le titre qui sera affiché sur la page.",
    },
  },
  validate: blogArticleTitleValidation,
};

export const bannerImage: Field = {
  name: 'bannerImage',
  label: {
    en: 'Banner Image',
    de: 'Bannerbild',
    fr: 'Image de bannière',
  },
  type: 'upload',
  relationTo: 'images',
  required: true,
  admin: {
    position: 'sidebar',
  },
};

export const blogReleaseDate: Field = {
  name: 'releaseDate',
  label: {
    en: 'Release Date',
    de: 'Datum der Veröffentlichung',
    fr: 'Date de publication',
  },
  type: 'date',
  required: true,
  admin: {
    position: 'sidebar',
    date: {
      pickerAppearance: 'dayAndTime',
      displayFormat: 'YYYY-MM-DD HH:mm',
      timeIntervals: 15,
    },
  },
};

export const blogTeaserText: Field = {
  name: 'blogShortTitle',
  label: {
    en: 'Teaser Text',
    de: 'Teaser-Text',
    fr: "Texte d'accroche",
  },
  type: 'textarea',
  localized: true,
  required: true,
  admin: {
    position: 'sidebar',
    description: {
      en: 'This is the text that will be displayed as a teaser on the blog overview page.',
      de: 'Dies ist der Text, der als Teaser auf der Blog-Übersichtsseite angezeigt wird.',
      fr: "C'est le texte qui sera affiché en tant qu'accroche sur la page d'aperçu du blog.",
    },
  },
};

export const blogSearchKeywords: Field = {
  name: 'blogSearchKeywords',
  label: {
    en: 'Search Keywords',
    de: 'Suchbegriffe',
    fr: 'Mots-clés de recherche',
  },
  type: 'textarea',
  localized: true,
  admin: {
    position: 'sidebar',
    description: {
      en: 'These keywords will be used for user search.',
      de: 'Diese Schlüsselwörter werden für die Benutzersuche verwendet.',
      fr: 'Ces mots-clés seront utilisés pour la recherche utilisateur.',
    },
  },
};
