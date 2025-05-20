import type { ContentBlockTypeNames } from '@/features/payload-cms/converters/page-sections/content-blocks';
import { cn } from '@/utils/tailwindcss-override';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

export type ContentBlock<T = object> = { blockType: ContentBlockTypeNames; id: string } & T;

const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => {
  import('@/lib/posthog-server')
    .then(({ getPostHogServer }): void => {
      const posthog = getPostHogServer();
      if (!posthog) return; // throw away if posthog is not available
      posthog.captureException(error);
    })
    .catch(() => {});

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
