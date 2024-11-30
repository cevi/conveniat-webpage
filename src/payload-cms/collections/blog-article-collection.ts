import { CollectionConfig, Field } from 'payload';
import { asLocalizedCollection } from '@/payload-cms/utils/localized-collection';
import { pageContent } from '@/payload-cms/fields/page-content';

const blogArticleTitleField: Field = {
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
};

const bannerImage: Field = {
  name: 'bannerImage',
  label: {
    en: 'Banner Image',
    de: 'Bannerbild',
    fr: 'Image de bannière',
  },
  type: 'upload',
  relationTo: 'media',
  required: true,
  admin: {
    position: 'sidebar',
  },
};

const blogTeaserText: Field = {
  name: 'blogShortTitle',
  label: {
    en: 'Teaser Text',
    de: 'Teaser-Text',
    fr: "Texte d'accroche",
  },
  type: 'text',
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

const blogArticleFields: Field[] = [
  blogArticleTitleField,
  bannerImage,
  blogTeaserText,
  pageContent,
];

export const BlogArticleCollection: CollectionConfig = asLocalizedCollection({
  // Unique, URL-friendly string that will act as an identifier for this Collection.
  slug: 'blog',

  admin: {
    description: {
      en: 'Represents a block article that can be published on the website.',
      de: 'Stellt einen Blog-Artikel dar, der auf der Website veröffentlicht werden kann.',
      fr: 'Représente un article de blog qui peut être publié sur le site Web.',
    },
    defaultColumns: ['id', 'blogShortTitle', 'releaseDate'],
    useAsTitle: 'blogH1',
  },

  labels: {
    singular: 'Blog Article',
    plural: 'Blog Articles',
  },

  fields: [
    ...blogArticleFields,

    {
      type: 'collapsible',
      label: 'SEO Settings',
      fields: [
        {
          name: 'urlSlug',
          label: 'URL Slug',
          type: 'text',
          required: true,
          localized: true,
          unique: true,
          admin: {
            position: 'sidebar',
            description: {
              en: 'This is the URL that will be used to access the article. It should be unique and URL-friendly.',
              de: 'Dies ist die URL, die zum Zugriff auf den Artikel verwendet wird. Es sollte eindeutig und URL-freundlich sein.',
              fr: "C'est l'URL qui sera utilisée pour accéder à l'article. Il doit être unique et convivial pour les URL.",
            },
          },
        },
      ],
      admin: {
        position: 'sidebar',
        description: {
          en: 'These settings are used to improve the visibility of the article in search engines.',
          de: 'Diese Einstellungen dienen dazu, die Sichtbarkeit des Artikels in Suchmaschinen zu verbessern.',
          fr: "Ces paramètres sont utilisés pour améliorer la visibilité de l'article dans les moteurs de recherche.",
        },
      },
    },
  ],
});
