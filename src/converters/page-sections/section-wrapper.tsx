import React from 'react';
import { cn } from '@/utils/tailwindcss-override';
import { ErrorBoundary } from 'react-error-boundary';
import { ContentBlockTypeNames } from '@/converters/page-sections/content-blocks';
import { InlineSwisstopoMapEmbedType } from '@/components/map-viewer/inline-swisstopo-map-embed';
import { HeroSectionType } from '@/components/content-blocks/hero-section';
import { FormBlockType } from '@/components/form';
import { FileDownloadType } from '@/components/content-blocks/file-download';

export type ContentBlock = {
  richTextSection?: SerializedEditorState;
  id?: string | null;
  blockName?: string | null;
  images?: PhotoCarouselBlock;
  link?: string | null;
  blockType: ContentBlockTypeNames;
} & InlineSwisstopoMapEmbedType &
  HeroSectionType &
  FormBlockType &
  FileDownloadType;

export type ContentBlock<T = object> = { blockType: ContentBlockTypeNames; id: string } & T;

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
      className={cn('mt-8 first:mt-0', sectionClassName, blockTypeOverrideClassName)}
    >
      <ErrorBoundary fallback={<ErrorFallback error={new Error(errorFallbackMessage)} />}>
        {children}
      </ErrorBoundary>
    </section>
  );
};

export default SectionWrapper;
