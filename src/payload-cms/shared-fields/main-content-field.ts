import { Field } from 'payload';
import { richtextArticleBlock } from '@/payload-cms/shared-blocks/richtext-article-block';
import { FormBlock } from '../shared-blocks/form-block';

export const MainContentField: Field = {
  name: 'mainContent',
  type: 'blocks',
  required: true,
  localized: true,
  admin: {
    description: {
      en: 'The main content of the page',
      de: 'Der Hauptinhalt der Seite',
      fr: 'Le contenu principal de la page',
    },
  },
  blocks: [
    richtextArticleBlock,
    {
      slug: 'blogPostsOverview',
      fields: [],
    },
    FormBlock
  ],
};
