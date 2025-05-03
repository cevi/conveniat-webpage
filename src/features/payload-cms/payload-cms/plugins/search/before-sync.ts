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

interface BlogContentBlock {
  blockType: string;
  richTextSection?: RichTextSection;
}

interface Content {
  blogH1?: string;
  blogShortTitle?: string;
  mainContent: BlogContentBlock[];
}

interface OriginalDocument {
  content: Content;
}

interface SearchDocument {
  title: string;
  search_title: string;
  search_content: string;
  doc: { relationTo: string; value: string };
  [key: string]: unknown; // Allow other dynamic keys
}

export const beforeSyncWithSearch: BeforeSync = async ({ originalDoc, searchDoc }) => {
  const typedDocument = originalDoc as OriginalDocument;
  const typedSearchDocument = searchDoc as SearchDocument;

  const content = typedDocument.content;

  const blogH1 = content.blogH1;
  const shortTitle = content.blogShortTitle;

  typedSearchDocument.search_title = blogH1 || shortTitle || '';
  typedSearchDocument.title = typedSearchDocument.search_title;

  typedSearchDocument.search_content = '';

  const blogContent = content.mainContent;
  for (const block of blogContent) {
    if (block.blockType === 'richTextSection' && block.richTextSection) {
      const richTextSection = block.richTextSection;
      const text = richTextSection.root.children.map((paragraph) => {
        const paragraphText = paragraph.children.map((child) => child.text || '');
        return paragraphText.join(' ');
      });
      typedSearchDocument.search_content = text.join('\n');
    }
  }

  return typedSearchDocument;
};
