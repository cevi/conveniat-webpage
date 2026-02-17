import { BiggerParagraphNode } from '@/features/payload-cms/payload-cms/shared-fields/rich-text-paragraph-field/bigger-paragraph-node';
import { createNode, createServerFeature } from '@payloadcms/richtext-lexical';

/**
 * Feature to create a bigger paragraph in the rich text editor.
 *
 * This feature is similar to the default paragraph feature but allows for a larger font size.
 * It is useful for emphasizing certain sections of text within the editor,
 * e.g. the lead of an article.
 *
 */
export const biggerParagraphFeature = createServerFeature({
  feature: {
    ClientFeature:
      '@/features/payload-cms/payload-cms/shared-fields/rich-text-paragraph-field/bigger-paragraph-feature-client#ParagraphFeatureClient',
    clientFeatureProps: undefined,
    i18n: {
      de: {
        label: 'Grösserer Paragraph',
        label2: 'Grösserer Paragraph',
      },
      en: {
        label: 'Bigger Paragraph',
        label2: 'Bigger Paragraph',
      },
      fr: {
        label: 'Paragraphe plus grand',
        label2: 'Paragraphe plus grand',
      },
    },
    nodes: [createNode({ node: BiggerParagraphNode })],
  },
  key: 'biggerParagraph',
});
