import { BiggerParagraphJSXConverter } from '@/features/payload-cms/converters/richtext-lexical/bigger-paragraph-converter';
import { HeadingJSXConverter } from '@/features/payload-cms/converters/richtext-lexical/heading-converter';
import { LinkJSXConverter } from '@/features/payload-cms/converters/richtext-lexical/link-converter';
import {
  ListItemJSXConverter,
  ListJSXConverter,
} from '@/features/payload-cms/converters/richtext-lexical/list-converter';
import { ParagraphJSXConverter } from '@/features/payload-cms/converters/richtext-lexical/paragraph-converter';
import { QuoteJSXConverter } from '@/features/payload-cms/converters/richtext-lexical/quote-converter';
import type { SerializedHeadingNode } from '@payloadcms/richtext-lexical';
import type { JSXConverters } from '@payloadcms/richtext-lexical/react';
import { LinebreakJSXConverter, TextJSXConverter } from '@payloadcms/richtext-lexical/react';

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
  ...LinebreakJSXConverter,
  ...BiggerParagraphJSXConverter,
};
