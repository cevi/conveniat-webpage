import { jsxConverters } from '@/features/payload-cms/converters/richtext-lexical';
import type { Locale } from '@/types/types';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { RichText } from '@payloadcms/richtext-lexical/react';
import type React from 'react';

export interface LexicalRichTextSectionType {
  richTextSection: SerializedEditorState;
}

/**
 * Renders the page content from an editor state.
 *
 * @param richTextSection
 * @param locale - The locale used for resolving internal links.
 * @param converters - Optional custom converters (e.g. for server-side async link resolution).
 */
export const LexicalRichTextSection: React.FC<{
  richTextSection: SerializedEditorState;
  locale?: Locale;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  converters?: Record<string, any>;
}> = ({ richTextSection, converters }) => {
  return <RichText converters={{ ...jsxConverters, ...converters }} data={richTextSection} />;
};
