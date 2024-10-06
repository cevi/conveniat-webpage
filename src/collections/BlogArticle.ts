import type { CollectionConfig, Field } from 'payload'
import { slateEditor } from '@payloadcms/richtext-slate'

const blogArticleMetaTitleField: Field = {
  name: 'metaTitle',
  label: 'Meta Title',
  type: 'text',
  defaultValue: 'Page Blog Article',
  required: true,
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
    description: 'This is the title that will be displayed in the browser tab and search results (e.g. Google search results).',
  },
}

const blogArticleMetaDescriptionField: Field = {
  name: 'metaDescription',
  label: 'Meta Description',
  type: 'textarea',
  defaultValue: 'Meta Description',
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
    description: 'This is the description that will be displayed in search results (e.g. Google search results).',
  },
}

const blogArticleReleaseDate: Field = {
  name: 'releaseDate',
  label: 'Release Date',
  defaultValue: new Date(),
  type: 'date',
  required: true,
  admin: {
    description: 'This is the date that the article will be released, prior to this date the article will not be visible for website visitors.',
    date: {
      pickerAppearance: 'dayAndTime',
      displayFormat: 'MMMM d, yyyy HH:mm',
      minDate: new Date(),
    },
  },
}

const blogArticleTitleField: Field = {
  name: 'blogH1',
  label: 'Title',
  type: 'text',
  localized: true,
  defaultValue: 'Untitled Blog Article',
  required: true,
  admin: {
    description: 'This is the title that will be displayed on the page.',
  },
}

const blogArticleShortTitleField: Field = {
  name: 'blogShortTitle',
  label: 'Short Title',
  type: 'text',
  defaultValue: 'Short Title',
  required: true,
  admin: {
    description: 'This is the title that will be displayed on top of the Title - h1.',
  },
}

const blogArticleCaptionField: Field = {
  name: 'blogCaption',
  label: 'Caption',
  type: 'textarea',
  defaultValue: 'Caption',
  required: true,
  admin: {
    description: 'This is the caption that will be displayed on top of the main content.',
  },
}


const blogArticleMainContentField: Field = {
  name: 'blogParagraph',
  label: 'Paragraph',
  type: 'richText',
  required: true,
  editor: slateEditor({
    admin: {
      elements: [
        'h2', 'h3', 'h4', 'blockquote', 'link', 'upload',
      ],
      leaves: ['bold', 'italic'],
    },
  }),
  admin: {
    // @ts-ignore
    placeholder: 'This is the main content of the article....',
  },
}

const blogArticleURLField: Field = {
  name: 'urlSlug',
  label: 'URL Slug',
  type: 'text',
  required: true,
  admin: {
    position: 'sidebar',
    description: 'This is the URL that will be used to access the article. It should be unique and URL-friendly.',
  },
}

const blogArticleFields: Field[] = [
  blogArticleShortTitleField,
  blogArticleTitleField,
  blogArticleCaptionField,
  blogArticleMainContentField,
]


export const BlogArticle: CollectionConfig = {
  // Unique, URL-friendly string that will act as an identifier for this Collection.
  slug: 'blog',

  admin: {
    description: 'A collection of blog articles. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi.',
    defaultColumns: ['id', 'blogShortTitle', 'releaseDate'],
    useAsTitle: 'blogShortTitle',
  },

  labels: {
    singular: 'Blog Article',
    plural: 'Blog Articles',
  },

  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Main Content',
          fields: blogArticleFields,
        },
      ],
    },

    {
      type: 'relationship',
      name: 'author',
      label: 'Author of the Article',
      relationTo: 'users',
      required: true,
      admin: {
        position: 'sidebar',
        description: 'This is the author of the article. The full name of the author will be displayed publicly on the article.',
      },
    },

    {
      type: 'collapsible',
      label: 'SEO Settings',
      fields: [
        blogArticleMetaTitleField,
        blogArticleMetaDescriptionField,
        blogArticleURLField,
      ],
      admin: {
        position: 'sidebar',
        description: 'These settings are used to improve the visibility of the article in search engines.',
      },
    },

    {
      type: 'collapsible',
      label: 'Publishing Settings',
      fields: [
        blogArticleReleaseDate,
        {
          name: 'forAuthenticatedOnly',
          label: 'Login Required',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            position: 'sidebar',
            description: 'This setting will require visitors to log in before they can view the article.',
          },
        },
      ],
      admin: {
        position: 'sidebar',
        description: 'These settings are used to control the visibility of the article on the website.',
      },
    },


  ],
  versions: {
    drafts: {
      autosave: {
        interval: 5000,
      },
    },
    maxPerDoc: 10,
  },

}
