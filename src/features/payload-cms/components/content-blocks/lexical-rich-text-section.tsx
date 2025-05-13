import { jsxConverters } from '@/features/payload-cms/converters/richtext-lexical';
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
 *
 */
export const LexicalRichTextSection: React.FC<{
  richTextSection: SerializedEditorState;
}> = ({ richTextSection }) => {
  return <RichText converters={jsxConverters} data={richTextSection} />;
};
