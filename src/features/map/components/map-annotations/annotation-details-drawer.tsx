'use client';

import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { Clock, Flag, MessageCircleQuestion, MessageSquare, X } from 'lucide-react';
import type React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

export const AnnotationDetailsDrawer: React.FC<{
  closeDrawer: () => void;
  annotation: CampMapAnnotationPoint | CampMapAnnotationPolygon;
}> = ({ closeDrawer, annotation }) => {
  // Placeholder data - not modifying the annotation object
  const placeholderOpeningHours = '08:00 - 22:00';

  const placeholderImages = [
    '/placeholder.svg?height=120&width=120',
    '/placeholder.svg?height=120&width=120',
    '/placeholder.svg?height=120&width=120',
  ];

  return (
    <div className="fixed right-0 bottom-[90px] left-0 z-[999] h-[50vh] overflow-hidden rounded-t-2xl bg-white shadow-[0px_-4px_38px_-19px_rgba(0,_0,_0,_0.1)]">
      <div className="flex h-full flex-col overflow-y-auto px-4 pt-6">
        <div className="relative">
          <button
            className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800"
            onClick={closeDrawer}
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <h2 className="p-4 pr-8 text-xl font-bold">{annotation.title}</h2>

          {/* Description */}
          <div className="border-b border-gray-50 p-4">
            <ErrorBoundary fallback={<div>Error loading annotation</div>}>
              <LexicalRichTextSection
                richTextSection={annotation.description as SerializedEditorState}
              />
            </ErrorBoundary>
          </div>

          {/* Opening Hours */}
          <div className="border-b border-gray-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock size={18} className="text-gray-600" />
              <h3 className="font-semibold text-gray-900">Opening Hours</h3>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{placeholderOpeningHours}</span>
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="border-b border-gray-50 p-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {placeholderImages.map((source, index) => (
                <img
                  key={index}
                  src={source}
                  alt={`Photo ${index + 1}`}
                  className="h-20 w-20 flex-shrink-0 rounded-lg border border-gray-200 object-cover"
                />
              ))}
            </div>
          </div>

          {/* Forum Post / Report Issues */}
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <MessageCircleQuestion size={18} className="text-gray-600" />
              <h3 className="font-semibold text-gray-900">conveniat27 Forum</h3>
            </div>
            <div className="space-y-2">
              <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-gray-300 hover:bg-gray-50">
                <MessageSquare size={16} className="text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">View Forum Posts</div>
                  <div className="text-sm text-gray-600">See what others are saying</div>
                </div>
              </button>
              <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-gray-300 hover:bg-gray-50">
                <Flag size={16} className="text-orange-600" />
                <div>
                  <div className="font-medium text-gray-900">Report an Issue</div>
                  <div className="text-sm text-gray-600">
                    Broken toilet, maintenance needed, etc.
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
