import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { X } from 'lucide-react';
import type React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

export const AnnotationDetailsDrawer: React.FC<{
  closeDrawer: () => void;
  annotation: CampMapAnnotationPoint | CampMapAnnotationPolygon;
}> = ({ closeDrawer, annotation }) => {
  return (
    <div className="fixed right-0 bottom-0 left-0 z-[999] h-[40vh] overflow-hidden rounded-t-2xl bg-white shadow-[0px_-4px_38px_-19px_rgba(0,_0,_0,_0.1)]">
      <div className="flex h-full flex-col">
        <div className="relative p-4">
          <button
            className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800"
            onClick={closeDrawer}
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <h2 className="pr-8 text-xl font-bold">{annotation.title}</h2>
        </div>
        <div className="overflow-y-auto px-4 pb-4">
          <ErrorBoundary fallback={<div>Error loading annotation</div>}>
            <LexicalRichTextSection
              richTextSection={annotation.description as SerializedEditorState}
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};
