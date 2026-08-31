import type { ContentBlockTypeNames } from '@/features/payload-cms/converters/page-sections/content-blocks';
import { SectionErrorBoundary } from '@/features/payload-cms/converters/page-sections/section-error-boundary';
import type { Locale, StaticTranslationString } from '@/types/types';
import { isAdminSession } from '@/utils/is-admin-session';
import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

export type ContentBlock<T = object> = { blockType: ContentBlockTypeNames; id: string } & T;

/**
 * True when a rich text block carries nothing but headings.
 *
 * Editors routinely put a section heading in its own block and the section's
 * body in the next one. Both blocks then get the same top margin, which leaves
 * the heading equally far from the section above it and from the content it
 * introduces. Marking the block lets the converter pull the following section
 * closer, so the heading reads as belonging to what comes after it.
 */
const isHeadingOnlyBlock = (block: ContentBlock): boolean => {
  if (block.blockType !== 'richTextSection') return false;

  const richText = (block as ContentBlock<{ richTextSection?: unknown }>).richTextSection;
  if (typeof richText !== 'object' || richText === null) return false;

  const root = (richText as { root?: { children?: unknown } }).root;
  const children = root?.children;
  if (!Array.isArray(children) || children.length === 0) return false;

  return children.every(
    (child) =>
      typeof child === 'object' &&
      child !== null &&
      (child as { type?: unknown }).type === 'heading',
  );
};

/**
 * Extra rhythm for blocks that are not simply the next thing on the page.
 * Applied before `sectionClassName`, so a column layout (which passes its own
 * tighter margins) and per-page overrides both still win.
 */
const blockSpacing: Partial<Record<ContentBlockTypeNames, string>> = {
  // A contact card closes off the content rather than continuing it.
  contactPerson: 'mt-12',
};

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
  const isDraftMode = await isAdminSession();

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
      data-heading-only={isHeadingOnlyBlock(block) ? '' : undefined}
      className={cn(
        'mt-8 first:mt-0',
        blockSpacing[block.blockType],
        sectionClassName ?? 'mx-auto w-full max-w-[1920px] px-4 md:px-8 xl:px-16',
        blockTypeOverrideClassName,
      )}
    >
      <SectionErrorBoundary
        locale={locale}
        errorFallbackMessage={errorFallbackMessage}
        isDraftMode={isDraftMode}
      >
        <div
          className={cn('w-full', {
            'max-w-[840px]': block.blockType === 'richTextSection',
            'max-w-[1120px]':
              block.blockType !== 'richTextSection' &&
              block.blockType !== 'twoColumnBlock' &&
              block.blockType !== 'formBlock' &&
              block.blockType !== 'heroSection',
          })}
        >
          {children}
        </div>
      </SectionErrorBoundary>
    </section>
  );
};

export default SectionWrapper;
