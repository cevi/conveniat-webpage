import {
  BlockquoteFeature,
  BoldFeature,
  defaultEditorLexicalConfig,
  FixedToolbarFeature,
  HeadingFeature,
  ItalicFeature,
  lexicalEditor as lexicalEditorGenerator,
  LexicalEditorProps,
  LinkFeature,
  ParagraphFeature,
  UnorderedListFeature,
} from '@payloadcms/richtext-lexical';

const defaultEditorFeatures: LexicalEditorProps['features'] = () => {
  return [
    ItalicFeature(),
    BoldFeature(),
    ParagraphFeature(),
    HeadingFeature({
      enabledHeadingSizes: ['h2', 'h3'],
    }),
    LinkFeature({
      fields: ({ defaultFields }) => [...defaultFields],
      // we only allow links to pages or blog posts
      // TODO: we should list the title or slug instead of the ID in the overview
      enabledCollections: ['generic-page', 'blog'],
    }),
    FixedToolbarFeature(),
    BlockquoteFeature(),
    UnorderedListFeature(),
  ];
};

export const lexicalEditor = lexicalEditorGenerator({
  features: defaultEditorFeatures,
  lexical: defaultEditorLexicalConfig,
});
