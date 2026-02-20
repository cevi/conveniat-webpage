import type { ContentBlockTypeNames } from '@/features/payload-cms/converters/page-sections/content-blocks';
import { SectionErrorBoundary } from '@/features/payload-cms/converters/page-sections/section-error-boundary';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { draftMode } from 'next/headers';
import React from 'react';

export type ContentBlock<T = object> = { blockType: ContentBlockTypeNames; id: string } & T;

const SectionWrapper = async ({
  block,
  sectionClassName,
  sectionOverrides,
  children,
  errorFallbackMessage,
  locale,
}: {
  block: ContentBlock;
  sectionClassName: string | undefined;
  sectionOverrides: { [key in ContentBlockTypeNames]?: string } | undefined;
  children: React.ReactNode;
  errorFallbackMessage: string;
  locale: Locale;
}): Promise<React.ReactElement> => {
  const blockTypeOverrideClassName = sectionOverrides?.[block.blockType];
  const draft = await draftMode();
  const isDraftMode = draft.isEnabled;

  // Pre-validate block in draft mode to avoid render crashes (e.g. missing required fields)
  if (isDraftMode) {
    const { validateContentBlock } =
      await import('@/features/payload-cms/utils/content-validation');
    const validationResult = validateContentBlock(block, locale);

    if (!validationResult.isValid) {
      const missingFieldsText = validationResult.missingFields.join(', ');

      const missingFieldsMessage: StaticTranslationString = {
        de: `Fehlende Pflichtfelder: ${missingFieldsText}`,
        en: `Missing required fields: ${missingFieldsText}`,
        fr: `Champs obligatoires manquants : ${missingFieldsText}`,
      };

      const errorTitle: StaticTranslationString = {
        de: `${validationResult.blockLabel}: Inhalt unvollständig`,
        en: `${validationResult.blockLabel}: Content Incomplete`,
        fr: `${validationResult.blockLabel} : Contenu incomplet`,
      };

      return (
        <section
          key={block.id}
          className={cn('mt-8 first:mt-0', sectionClassName, blockTypeOverrideClassName)}
        >
          <SectionErrorBoundary
            locale={locale}
            errorFallbackMessage={errorFallbackMessage}
            isDraftMode={isDraftMode}
            forceError={new Error(missingFieldsMessage[locale])}
            errorTitle={errorTitle[locale]}
          >
            {/* We render nothing here because we forced an error state */}
            <></>
          </SectionErrorBoundary>
        </section>
      );
    }
  }

  return (
    <section
      key={block.id}
      className={cn(
        'mt-8 first:mt-0',
        sectionClassName ?? 'mx-auto w-full max-w-[1920px] px-4 md:px-8 xl:px-16',
        blockTypeOverrideClassName,
      )}
    >
      <SectionErrorBoundary
        locale={locale}
        errorFallbackMessage={errorFallbackMessage}
        isDraftMode={isDraftMode}
      >
        {children}
      </SectionErrorBoundary>
    </section>
  );
};

export default SectionWrapper;
