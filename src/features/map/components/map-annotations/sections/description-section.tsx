'use client';

import { SafeErrorBoundary } from '@/components/error-boundary/safe-error-boundary';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import type React from 'react';

const errorLoadingAnnotation: StaticTranslationString = {
  de: 'Fehler beim Laden der Annotation',
  en: 'Error loading annotation',
  fr: "Erreur lors du chargement de l'annotation",
};

interface AnnotationDescriptionSectionProperties {
  description: SerializedEditorState;
}

export const AnnotationDescriptionSection: React.FC<AnnotationDescriptionSectionProperties> = ({
  description,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <div className="pb-2 text-[15px] leading-normal text-green-700">
      <SafeErrorBoundary fallback={<div>{errorLoadingAnnotation[locale]}</div>}>
        <LexicalRichTextSection richTextSection={description} locale={locale} />
      </SafeErrorBoundary>
    </div>
  );
};
