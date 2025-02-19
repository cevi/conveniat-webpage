import { LexicalRichTextSection } from '@/components/content-blocks/lexical-rich-text-section';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { ListBlogPosts } from '@/components/content-blocks/list-blog-articles';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { PhotoCarousel, PhotoCarouselBlock } from '@/components/gallery';
import { LocalizedPageType } from '@/types';
import { cn } from '@/utils/tailwindcss-override';
import { HeroSection, HeroSectionType } from '@/components/content-blocks/hero-section';
import { YoutubeEmbed } from '@/components/content-blocks/youtube-embed';
import { ShowForm } from '@/components/content-blocks/show-form';
import { FormBlockType } from '@/components/form';

export type ContentBlockTypeNames =
  | 'blogPostsOverview'
  | 'richTextSection'
  | 'formBlock'
  | 'photoCarousel'
  | 'youtubeEmbed'
  | 'heroSection';
export type ContentBlock = {
  richTextSection?: SerializedEditorState;
  id?: string | null;
  blockName?: string | null;
  images?: PhotoCarouselBlock;
  link?: string | null;
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

/**
 * A React component responsible for rendering the page sections of type blocks: ContentBlock.
 * This component is used to render the main content of a page.
 *
 * @param blocks
 * @param locale
 * @param searchParams
 * @param sectionClassName
 * @constructor
 */
export const PageSectionsConverter: React.FC<
  LocalizedPageType & {
    blocks: ContentBlock[];
    sectionClassName?: string;
    // potential overrides for specific sections (key value ContentBlockTypeNames -> string)
    sectionOverrides: { [key in ContentBlockTypeNames]?: string };
  }
> = ({ blocks, locale, searchParams, sectionClassName, sectionOverrides }) => {
  return blocks.map((block) => {
    switch (block.blockType) {
      case 'richTextSection': {
        return (
          <section
            key={block.id}
            className={cn(cn('mt-16', sectionClassName), sectionOverrides['richTextSection'])}
          >
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
          <section
            key={block.id}
            className={cn(cn('mt-16', sectionClassName), sectionOverrides['blogPostsOverview'])}
          >
            <ErrorBoundary
              fallback={
                <ErrorFallback
                  error={new Error('Failed to load blog posts. Reload the page to try again.')}
                />
              }
            >
              <ListBlogPosts locale={locale} searchParams={searchParams} />
            </ErrorBoundary>
          </section>
        );
      }

      case 'formBlock': {
        return (
          <section
            key={block.id}
            className={cn(cn('mt-16', sectionClassName), sectionOverrides['formBlock'])}
          >
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
          <section
            key={block.id}
            className={cn(cn('mt-16', sectionClassName), sectionOverrides['photoCarousel'])}
          >
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

      case 'youtubeEmbed': {
        return (
          <section
            key={block.id}
            className={cn(cn('mt-16', sectionClassName), sectionOverrides['youtubeEmbed'])}
          >
            <ErrorBoundary
              fallback={
                <ErrorFallback
                  error={new Error('Failed to load youtube link. Reload the page to try again.')}
                />
              }
            >
              <YoutubeEmbed link={block.link ?? ''} />
            </ErrorBoundary>
          </section>
        );
      }

      case 'heroSection': {
        return (
          <section
            key={block.id}
            className={cn(cn('mt-16', sectionClassName), sectionOverrides['heroSection'])}
          >
            <ErrorBoundary
              fallback={
                <ErrorFallback
                  error={new Error('Failed to load hero section. Reload the page to try again.')}
                />
              }
            >
              <HeroSection {...(block as HeroSectionType)} />
            </ErrorBoundary>
          </section>
        );
      }
    }
  });
};
