import {
  BlockquoteFeature,
  BoldFeature,
  defaultEditorLexicalConfig,
  FixedToolbarFeature,
  HeadingFeature,
  ItalicFeature,
  lexicalEditor as lexicalEditorGenerator,
  LinkFeature,
  ParagraphFeature,
  UnorderedListFeature,
} from '@payloadcms/richtext-lexical';

export const minimalEditorFeatures = [
  // a fixed toolbar that is always visible
  FixedToolbarFeature(),

  // basic text formatting
  ItalicFeature(),
  BoldFeature(),
  ParagraphFeature(),
  LinkFeature({
    fields: ({ defaultFields }) => [...defaultFields],
    // we only allow links to pages or blog posts
    // TODO: we should list the title or slug instead of the ID in the overview
    enabledCollections: ['generic-page', 'blog'],
  }),
];

export const defaultEditorFeatures = [
  ...minimalEditorFeatures,
  HeadingFeature({
    enabledHeadingSizes: ['h2', 'h3'],
  }),
  BlockquoteFeature(),
  UnorderedListFeature(),
];

export const lexicalEditor = lexicalEditorGenerator({
  features: defaultEditorFeatures,
  lexical: defaultEditorLexicalConfig,
});
