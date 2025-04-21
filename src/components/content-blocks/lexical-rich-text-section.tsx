import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { RichText } from '@payloadcms/richtext-lexical/react';
import React from 'react';
import { jsxConverters } from '@/converters/richtext-lexical';

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
