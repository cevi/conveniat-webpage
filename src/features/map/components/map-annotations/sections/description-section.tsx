import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import type React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

interface AnnotationDescriptionSectionProperties {
  description: SerializedEditorState;
}

export const AnnotationDescriptionSection: React.FC<AnnotationDescriptionSectionProperties> = ({
  description,
}) => {
  return (
    <div className="border-b-2 border-gray-100 p-4">
      <ErrorBoundary fallback={<div>Error loading annotation</div>}>
        <LexicalRichTextSection richTextSection={description} />
      </ErrorBoundary>
    </div>
  );
};
