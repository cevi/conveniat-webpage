import { environmentVariables } from '@/config/environment-variables';
import {
  AlignFeature,
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
import type { CollectionSlug } from 'payload';

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
    /* ATTENTION: if a collection was added here:
      make sure to:
      - update /src/features/payload-cms/converters/richtext-lexical/link-converter.tsx
      - update /src/features/payload-cms/payload-cms/plugins/form/fix-links-in-mails.ts
      */
    enabledCollections: [
      'generic-page',
      'blog',
      'images',
      'documents',
      ...(environmentVariables.FEATURE_ENABLE_APP_FEATURE
        ? ['camp-map-annotations' as CollectionSlug]
        : []),
      ...(environmentVariables.FEATURE_ENABLE_APP_FEATURE
        ? ['camp-schedule-entry' as CollectionSlug]
        : []),
    ],
  }),
];

export const defaultEditorFeatures = [
  ...minimalEditorFeatures,
  HeadingFeature({
    enabledHeadingSizes: ['h2', 'h3'],
  }),
  BlockquoteFeature(),
  UnorderedListFeature(),
  AlignFeature(),
];

export const lexicalEditor = lexicalEditorGenerator({
  features: defaultEditorFeatures,
  lexical: defaultEditorLexicalConfig,
});
