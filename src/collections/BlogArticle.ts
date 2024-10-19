import { CollectionConfig, Field } from 'payload'
import { slateEditor } from '@payloadcms/richtext-slate'
import { asLocalizedCollection } from '@/utils/localizedCollection'

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
}

const blogArticleShortTitleField: Field = {
  name: 'blogShortTitle',
  label: {
    en: 'Short Title',
    de: 'Untertitel',
    fr: 'Sous-titre',
  },
  type: 'text',
  localized: true,
  required: true,
  admin: {
    description: {
      en: 'This is the title that will be displayed on top of the Title - h1.',
      de: 'Dies ist der Titel, der oben auf dem Titel - h1 angezeigt wird.',
      fr: "C'est le titre qui sera affiché au-dessus du titre - h1.",
    },
  },
}

const blogArticleCaptionField: Field = {
  name: 'blogCaption',
  label: 'Caption',
  type: 'textarea',
  localized: true,
  required: true,
  admin: {
    description: {
      en: 'This is the caption that will be displayed on top of the main content.',
      de: 'Dies ist die Bildunterschrift, die über dem Hauptinhalt angezeigt wird.',
      fr: "C'est la légende qui sera affichée au-dessus du contenu principal.",
    },
  },
}

const blogArticleMainContentField: Field = {
  name: 'blogParagraph',
  label: 'Paragraph',
  type: 'richText',
  required: true,
  localized: true,
  editor: slateEditor({
    admin: {
      elements: ['h2', 'h3', 'h4', 'blockquote', 'link', 'upload'],
      leaves: ['bold', 'italic'],
    },
  }),
  admin: {
    description: {
      en: 'This is the main content of the article....',
      de: 'Dies ist der Hauptinhalt des Artikels....',
      fr: "C'est le contenu principal de l'article....",
    },
  },
}

const blogArticleFields: Field[] = [
  // blogArticleShortTitleField,
  blogArticleTitleField,
  // blogArticleCaptionField,
  //blogArticleMainContentField,
]

export const BlogArticle: CollectionConfig = asLocalizedCollection({
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

    /*
    {
      type: 'relationship',
      name: 'author',
      label: {
        en: 'Author of the Article',
        de: 'Autor des Artikels',
        fr: 'Auteur de l\'article',
      },
      relationTo: 'users',
      required: true,
      admin: {
        position: 'sidebar',
        description: {
          en: 'This is the author of the article. The full name of the author will be displayed publicly on the article.',
          de: 'Dies ist der Autor des Artikels. Der vollständige Name des Autors wird öffentlich auf dem Artikel angezeigt.',
          fr: 'C\'est l\'auteur de l\'article. Le nom complet de l\'auteur sera affiché publiquement sur l\'article.',
        },
      },
    },

/*
     */
    {
      type: 'collapsible',
      label: 'SEO Settings',
      fields: [
        /*
        {
          name: 'metaTitle',
          label: 'Meta Title',
          type: 'text',
          required: true,
          localized: true,
          validate: (value: string[] | string | undefined | null) => {
            if (typeof value !== 'string') {
              return 'The meta title must be a string'
            }

            if (value.length > 70) {
              return 'The meta title must be less than 70 characters'
            }

            if (value.length < 10) {
              return 'The meta title must be more than 10 characters'
            }

            return true
          },
          admin: {
            description:
              'This is the title that will be displayed in the browser tab and search results (e.g. Google search results).',
          },
        },
        {
          name: 'metaDescription',
          label: 'Meta Description',
          type: 'textarea',
          localized: true,
          required: true,
          validate: (value: string[] | string | undefined | null) => {
            if (typeof value !== 'string') {
              return 'The meta description must be a string'
            }

            if (value.length > 160) {
              return 'The meta description must be less than 160 characters'
            }

            if (value.length < 10) {
              return 'The meta description must be more than 10 characters'
            }

            return true
          },
          admin: {
            description:
              'This is the description that will be displayed in search results (e.g. Google search results).',
          },
        }, */
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
    /*
        {
          type: 'collapsible',
          label: 'Publishing Settings',
          fields: [
            {
              name: 'releaseDate',
              label: {
                en: 'Release Date',
                de: 'Veröffentlichungsdatum',
                fr: 'Date de publication',
              },
              defaultValue: new Date(),
              type: 'date',
              required: true,
              admin: {
                description: {
                  en: 'This is the date that the article will be released, prior to this date the article will not be visible for website visitors.',
                  de: 'Dies ist das Datum, an dem der Artikel veröffentlicht wird. Vor diesem Datum ist der Artikel für Website-Besucher nicht sichtbar.',
                  fr: 'C\'est la date à laquelle l\'article sera publié, avant cette date, l\'article ne sera pas visible pour les visiteurs du site Web.',
                },
                date: {
                  pickerAppearance: 'dayAndTime',
                  displayFormat: 'MMMM d, yyyy HH:mm',
                  minDate: new Date(),
                },
              },
            },
            {
              name: 'forAuthenticatedOnly',
              label: {
                en: 'Login Required',
                de: 'Anmeldung erforderlich',
                fr: 'Connexion requise',
              },
              type: 'checkbox',
              defaultValue: false,
              admin: {
                position: 'sidebar',
                description: {
                  en: 'This setting will require visitors to log in before they can view the article.',
                  de: 'Diese Einstellung erfordert, dass Besucher sich anmelden, bevor sie den Artikel anzeigen können.',
                  fr: 'Ce paramètre nécessitera que les visiteurs se connectent avant de pouvoir consulter l\'article.',
                },
              },
            },
          ],
          admin: {
            position: 'sidebar',
            description: {
              en: 'These settings are used to control the visibility of the article on the website.',
              de: 'Diese Einstellungen dienen dazu, die Sichtbarkeit des Artikels auf der Website zu steuern.',
              fr: 'Ces paramètres sont utilisés pour contrôler la visibilité de l\'article sur le site Web.',
            },
          },
        },*/
  ],
})
