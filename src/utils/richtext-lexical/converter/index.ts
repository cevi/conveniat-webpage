import { JSXConverters, TextJSXConverter } from '@payloadcms/richtext-lexical/react';
import { SerializedHeadingNode } from '@payloadcms/richtext-lexical';
import { HeadingJSXConverter } from '@/utils/richtext-lexical/converter/heading-converter';
import { ParagraphJSXConverter } from '@/utils/richtext-lexical/converter/paragraph-converter';

/**
 * The JSX converters for the rich text editor.
 *
 * Based on the default converters enriched with our custom converters / overrides.
 *
 */
export const jsxConverters: JSXConverters<SerializedHeadingNode> = {
  ...ParagraphJSXConverter,
  ...TextJSXConverter,
  ...HeadingJSXConverter,
};
