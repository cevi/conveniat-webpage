import { JSXConverters, TextJSXConverter } from '@payloadcms/richtext-lexical/react';
import { SerializedHeadingNode } from '@payloadcms/richtext-lexical';
import { HeadingJSXConverter } from '@/converters/richtext-lexical/heading-converter';
import { ParagraphJSXConverter } from '@/converters/richtext-lexical/paragraph-converter';
import { LinkJSXConverter } from '@/converters/richtext-lexical/link-converter';
import {
  ListItemJSXConverter,
  ListJSXConverter,
} from '@/converters/richtext-lexical/list-converter';
import { QuoteJSXConverter } from '@/converters/richtext-lexical/quote-converter';

/**
 * The JSX converters for the rich text editor.
 *
 * Based on the default converters enriched with our custom converters / overrides.
 *
 */
export const jsxConverters: JSXConverters<SerializedHeadingNode> = {
  ...TextJSXConverter,
  ...LinkJSXConverter,
  ...ParagraphJSXConverter,
  ...HeadingJSXConverter,
  ...ListJSXConverter,
  ...ListItemJSXConverter,
  ...QuoteJSXConverter,
};
