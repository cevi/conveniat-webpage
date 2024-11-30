import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { RichText } from '@payloadcms/richtext-lexical/react';
import { jsxConverters } from '@/utils/richtext-lexical/lexical-jsx-converter';
import React from 'react';

/**
 * Renders the page content from an editor state.
 *
 * @param pageContent
 *
 */
export const LexicalPageContent: React.FC<{
  pageContent: SerializedEditorState;
}> = ({ pageContent }) => {
  return <RichText converters={jsxConverters} data={pageContent} />;
};
