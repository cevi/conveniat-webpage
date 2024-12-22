import { LexicalPageContent } from '@/components/content-blocks/lexical-page-content';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { ListBlogPosts } from '@/components/content-blocks/list-blog-articles';
import React from 'react';
import { LocalizedPage } from '@/page-layouts/localized-page';
import { ShowForm } from '@/components/content-blocks/show-form';

export type ContentBlockTypeNames = 'blogPostsOverview' | 'article' | 'formBlock';
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
      case 'article': {
        return (
          <section key={block.id} className="mt-16">
            <LexicalPageContent pageContent={block.pageContent as SerializedEditorState} />
          </section>
        );
      }

      case 'blogPostsOverview': {
        return (
          <section key={block.id} className="mt-16">
            <ListBlogPosts locale={locale} />
          </section>
        );
      }

      case 'formBlock': {
        return (
          <section key={block.id} className="mt-16">
            
            <ShowForm {...block}/>
          </section>
        )
      }
    }
  });
};
