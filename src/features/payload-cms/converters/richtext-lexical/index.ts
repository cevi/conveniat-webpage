import { BiggerParagraphJSXConverter } from '@/features/payload-cms/converters/richtext-lexical/bigger-paragraph-converter';
import { HeadingJSXConverter } from '@/features/payload-cms/converters/richtext-lexical/heading-converter';
import { getLinkJSXConverter } from '@/features/payload-cms/converters/richtext-lexical/link-converter';
import {
  ListItemJSXConverter,
  ListJSXConverter,
} from '@/features/payload-cms/converters/richtext-lexical/list-converter';
import { ParagraphJSXConverter } from '@/features/payload-cms/converters/richtext-lexical/paragraph-converter';
import { QuoteJSXConverter } from '@/features/payload-cms/converters/richtext-lexical/quote-converter';
import type { Locale } from '@/types/types';
import type { SerializedHeadingNode } from '@payloadcms/richtext-lexical';
import type { JSXConverters } from '@payloadcms/richtext-lexical/react';
import { LinebreakJSXConverter, TextJSXConverter } from '@payloadcms/richtext-lexical/react';

/**
 * Returns the JSX converters for the rich text editor.
 *
 * Based on the default converters enriched with our custom converters / overrides.
 *
 * @param locale - The locale used for resolving internal links.
 *
 */
export const getJsxConverters = (locale?: Locale): JSXConverters<SerializedHeadingNode> => ({
  ...TextJSXConverter,
  ...getLinkJSXConverter(locale),
  ...ParagraphJSXConverter,
  ...HeadingJSXConverter,
  ...ListJSXConverter,
  ...ListItemJSXConverter,
  ...QuoteJSXConverter,
  ...LinebreakJSXConverter,
  ...BiggerParagraphJSXConverter,
});

/**
 * The default JSX converters for the rich text editor.
 */
export const jsxConverters: JSXConverters<SerializedHeadingNode> = getJsxConverters();
