import { JSXConverters, TextJSXConverter } from '@payloadcms/richtext-lexical/react';
import { SerializedHeadingNode } from '@payloadcms/richtext-lexical';
import { HeadingJSXConverter } from '@/converters/richtext-lexical/heading-converter';
import { ParagraphJSXConverter } from '@/converters/richtext-lexical/paragraph-converter';

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
