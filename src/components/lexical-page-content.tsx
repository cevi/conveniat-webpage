import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { RichText } from '@payloadcms/richtext-lexical/react';
import React from 'react';
import { jsxConverters } from '@/utils/richtext-lexical/converter';

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
