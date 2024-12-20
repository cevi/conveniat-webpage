import { LexicalPageContent } from '@/components/content-blocks/lexical-page-content';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { ListBlogPosts } from '@/components/content-blocks/list-blog-articles';
import React from 'react';
import { LocalizedPage } from '@/page-layouts/localized-page';

export type ContentBlockTypeNames = 'blogPostsOverview' | 'textContent';
export type ContentBlock = {
  pageContent?: SerializedEditorState;
  id?: string | null;
  blockName?: string | null;
  blockType: ContentBlockTypeNames;
};

export const BuildingBlocks: React.FC<LocalizedPage & { blocks: ContentBlock[] }> = ({
  blocks,
  locale,
}) => {
  return blocks.map((block) => {
    switch (block.blockType) {
      case 'textContent': {
        return <LexicalPageContent pageContent={block.pageContent as SerializedEditorState} />;
      }

      case 'blogPostsOverview': {
        return <ListBlogPosts locale={locale} />;
      }
    }
  });
};
