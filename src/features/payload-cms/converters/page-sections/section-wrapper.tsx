import { SafeErrorBoundary } from '@/components/error-boundary/safe-error-boundary';
import type { ContentBlockTypeNames } from '@/features/payload-cms/converters/page-sections/content-blocks';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

export type ContentBlock<T = object> = { blockType: ContentBlockTypeNames; id: string } & T;

const errorMessageText: StaticTranslationString = {
  de: 'Der Inhalt konnte nicht geladen werden.',
  en: 'Failed to load content block.',
  fr: 'Échec du chargement du bloc de contenu.',
};

const ErrorFallback: React.FC<{ error: Error; locale: Locale }> = ({ locale, error }) => {
  return (
    <div className="rounded-2xl bg-gray-100 px-16 py-4 text-center text-red-700">
      <b>{errorMessageText[locale]}</b> <br />
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
  locale: Locale;
}> = ({ block, sectionClassName, sectionOverrides, children, errorFallbackMessage, locale }) => {
  const blockTypeOverrideClassName = sectionOverrides?.[block.blockType];
  return (
    <section
      key={block.id}
      className={cn('mt-8 first:mt-0', sectionClassName, blockTypeOverrideClassName)}
    >
      <SafeErrorBoundary
        fallback={<ErrorFallback error={new Error(errorFallbackMessage)} locale={locale} />}
      >
        {children}
      </SafeErrorBoundary>
    </section>
  );
};

export default SectionWrapper;
