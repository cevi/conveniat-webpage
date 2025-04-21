import type { JSXConverters } from '@payloadcms/richtext-lexical/react';
import { TextJSXConverter } from '@payloadcms/richtext-lexical/react';
import type { SerializedHeadingNode } from '@payloadcms/richtext-lexical';
import { HeadingJSXConverter } from '@/features/payload-cms/converters/richtext-lexical/heading-converter';
import { ParagraphJSXConverter } from '@/features/payload-cms/converters/richtext-lexical/paragraph-converter';
import { LinkJSXConverter } from '@/features/payload-cms/converters/richtext-lexical/link-converter';
import {
  ListItemJSXConverter,
  ListJSXConverter,
} from '@/features/payload-cms/converters/richtext-lexical/list-converter';
import { QuoteJSXConverter } from '@/features/payload-cms/converters/richtext-lexical/quote-converter';

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
