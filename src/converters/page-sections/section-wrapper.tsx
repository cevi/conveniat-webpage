import React from 'react';
import { cn } from '@/utils/tailwindcss-override';
import { ErrorBoundary } from 'react-error-boundary';
import { PhotoCarouselBlock } from '@/components/gallery';
import { ContentBlockTypeNames } from '@/converters/page-sections/content-blocks';
import { InlineSwisstopoMapEmbedType } from '@/components/map-viewer/inline-swisstopo-map-embed';
import { HeroSectionType } from '@/components/content-blocks/hero-section';
import { FormBlockType } from '@/components/form';
import { YoutubeEmbedType } from '@/components/content-blocks/youtube-embed';
import { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';

export type ContentBlock = { blockType: ContentBlockTypeNames; id: string } & (
  | InlineSwisstopoMapEmbedType
  | HeroSectionType
  | FormBlockType
  | PhotoCarouselBlock
  | YoutubeEmbedType
  | { richTextSection: SerializedEditorState }
  | {
      introduction: SerializedEditorState;
      detailsTableBlocks: { label: string; value: SerializedEditorState }[];
    }
);

const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => {
  return (
    <div className="rounded-2xl bg-gray-100 px-16 py-4 text-center text-red-700">
      <b>Failed to load content block.</b> <br />
      {error.message}
    </div>
  );
};

const SectionWrapper: React.FC<{
  block: ContentBlock;
  sectionClassName: string | undefined;
  sectionOverrides: { [key in ContentBlockTypeNames]?: string } | undefined;
  children: React.ReactNode;
  errorFallbackMessage: string;
}> = ({ block, sectionClassName, sectionOverrides, children, errorFallbackMessage }) => {
  const blockTypeOverrideClassName = sectionOverrides?.[block.blockType];
  return (
    <section
      key={block.id}
      className={cn(cn('mt-16', sectionClassName), blockTypeOverrideClassName)}
    >
      <ErrorBoundary fallback={<ErrorFallback error={new Error(errorFallbackMessage)} />}>
        {children}
      </ErrorBoundary>
    </section>
  );
};

export default SectionWrapper;
