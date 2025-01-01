import { LexicalRichTextSection } from '@/components/content-blocks/lexical-rich-text-section';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { ListBlogPosts } from '@/components/content-blocks/list-blog-articles';
import React from 'react';
import { LocalizedPage } from '@/page-layouts/localized-page';
import { ShowForm } from '@/components/content-blocks/show-form';
import { FormBlockType } from '@/components/form';
import { ErrorBoundary } from 'react-error-boundary';
import { PhotoCarousel, PhotoCarouselBlock } from '@/components/gallery';

export type ContentBlockTypeNames =
  | 'blogPostsOverview'
  | 'richTextSection'
  | 'formBlock'
  | 'photoCarousel';
export type ContentBlock = {
  richTextSection?: SerializedEditorState;
  id?: string | null;
  blockName?: string | null;
  images?: PhotoCarouselBlock;
  blockType: ContentBlockTypeNames;
};

const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => {
  return (
    <div className="rounded-2xl bg-gray-100 px-16 py-4 text-center text-red-700">
      <b>Failed to load content block.</b> <br />
      {error.message}
    </div>
  );
};

export const BuildingBlocks: React.FC<LocalizedPage & { blocks: ContentBlock[] }> = ({
  blocks,
  locale,
}) => {
  return blocks.map((block) => {
    switch (block.blockType) {
      case 'richTextSection': {
        return (
          <section key={block.id} className="mt-16">
            <ErrorBoundary
              fallback={
                <ErrorFallback
                  error={new Error('Failed to load richTextSection. Reload the page to try again.')}
                />
              }
            >
              <LexicalRichTextSection
                richTextSection={block.richTextSection as SerializedEditorState}
              />
            </ErrorBoundary>
          </section>
        );
      }

      case 'blogPostsOverview': {
        return (
          <section key={block.id} className="mt-16">
            <ErrorBoundary
              fallback={
                <ErrorFallback
                  error={new Error('Failed to load blog posts. Reload the page to try again.')}
                />
              }
            >
              <ListBlogPosts locale={locale} />
            </ErrorBoundary>
          </section>
        );
      }

      case 'formBlock': {
        return (
          <section key={block.id} className="mt-16">
            <ErrorBoundary
              fallback={
                <ErrorFallback
                  error={new Error('Failed to load blog posts. Reload the page to try again.')}
                />
              }
            >
              <ShowForm {...(block as FormBlockType)} />
            </ErrorBoundary>
          </section>
        );
      }

      case 'photoCarousel': {
        return (
          <section key={block.id} className="mt-16">
            <ErrorBoundary
              fallback={
                <ErrorFallback
                  error={new Error('Failed to load photo carousel. Reload the page to try again.')}
                />
              }
            >
              <PhotoCarousel images={block.images ?? []} />
            </ErrorBoundary>
          </section>
        );
      }
    }
  });
};
