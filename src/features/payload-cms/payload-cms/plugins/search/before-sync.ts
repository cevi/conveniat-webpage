import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import { extractTextContent } from '@/features/payload-cms/payload-cms/utils/extract-rich-text';
import type { BeforeSync } from '@payloadcms/plugin-search/types';

interface PageContent {
  pageTitle?: string;
  mainContent: ContentBlock[];
}

interface OriginalDocument {
  content: PageContent;
}

interface SearchDocument {
  title: string;
  search_title: string;
  search_content: string;
  doc: { relationTo: string; value: string };

  [key: string]: unknown; // Allow other dynamic keys
}

export const beforeSyncWithSearch: BeforeSync = ({ originalDoc, searchDoc }) => {
  const typedDocument = originalDoc as OriginalDocument;
  const typedSearchDocument = searchDoc as SearchDocument;

  typedSearchDocument.search_title = typedDocument.content.pageTitle ?? '';
  typedSearchDocument.search_content = extractTextContent(typedDocument.content.mainContent);

  typedSearchDocument.title = typedSearchDocument.search_title;
  return typedSearchDocument;
};
