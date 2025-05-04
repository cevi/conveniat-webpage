import type { BeforeSync } from '@payloadcms/plugin-search/types';

interface RichTextChild {
  text: string;
}

interface RichTextParagraph {
  children: RichTextChild[];
}

interface RichTextRoot {
  children: RichTextParagraph[];
}

interface RichTextSection {
  root: RichTextRoot;
}

interface ContentBlock {
  blockType: string;
  richTextSection?: RichTextSection;
}

interface BlogContent {
  blogH1?: string;
  blogShortTitle?: string;
  mainContent: ContentBlock[];
}

interface PageContent {
  pageTitle?: string;
  mainContent: ContentBlock[];
}

interface OriginalDocument {
  content: BlogContent | PageContent;
}

interface SearchDocument {
  title: string;
  search_title: string;
  search_content: string;
  doc: { relationTo: string; value: string };
  [key: string]: unknown; // Allow other dynamic keys
}

const extractRichTextContent = (mainContent: ContentBlock[]): string => {
  let searchContent = '';
  for (const block of mainContent) {
    if (block.blockType === 'richTextSection' && block.richTextSection) {
      const richTextSection = block.richTextSection;
      const text = richTextSection.root.children.map((paragraph) => {
        const paragraphText = paragraph.children.map((child) => child.text || '');
        return paragraphText.join(' ');
      });
      searchContent += text.join(' ');
    }
  }
  return searchContent;
};

export const beforeSyncWithSearch: BeforeSync = async ({ originalDoc, searchDoc }) => {
  const typedDocument = originalDoc as OriginalDocument;
  const typedSearchDocument = searchDoc as SearchDocument;

  typedSearchDocument.search_content = '';

  // check if typedDocument is a blog or a generic page
  if (searchDoc.doc.relationTo === 'blog') {
    const content = typedDocument.content as BlogContent;
    const blogH1 = content.blogH1;
    const shortTitle = content.blogShortTitle;

    typedSearchDocument.search_title = blogH1 || shortTitle || '';
    typedSearchDocument.search_content = extractRichTextContent(content.mainContent);
  } else {
    const content = typedDocument.content as PageContent;
    typedSearchDocument.search_title = content.pageTitle || '';
    typedSearchDocument.search_content = extractRichTextContent(content.mainContent);
  }

  typedSearchDocument.title = typedSearchDocument.search_title;
  return typedSearchDocument;
};
