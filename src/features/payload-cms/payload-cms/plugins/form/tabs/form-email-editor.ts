import { minimalEditorFeatures } from '@/features/payload-cms/payload-cms/plugins/lexical-editor';
import {
  defaultEditorLexicalConfig,
  HeadingFeature,
  lexicalEditor,
  UnorderedListFeature,
} from '@payloadcms/richtext-lexical';

/**
 * The editor of a form's emails, its confirmation message and its approval emails.
 *
 * Bullet lists are in because a mail lists what was registered. An editor must know every node
 * its content holds: a list written without this feature made the field fail to load with
 * "Minified Lexical error #17".
 */
export const formEmailEditor = lexicalEditor({
  features: [
    ...minimalEditorFeatures,
    HeadingFeature({
      enabledHeadingSizes: ['h3'],
    }),
    UnorderedListFeature(),
  ],
  lexical: defaultEditorLexicalConfig,
});
