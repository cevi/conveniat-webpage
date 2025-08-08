import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

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
    <div className="border-b-2 border-gray-100 p-4">
      <ErrorBoundary fallback={<div>{errorLoadingAnnotation[locale]}</div>}>
        <LexicalRichTextSection richTextSection={description} />
      </ErrorBoundary>
    </div>
  );
};
