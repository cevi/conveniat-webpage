import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { Clock, Flag, MessageCircleQuestion, MessageSquare, X } from 'lucide-react';
import Image from 'next/image';
import React, { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// Define a type for your camp program entries
interface CampProgramEntry {
  id: string;
  title: string;
  time: string;
  description: string;
}

export const AnnotationDetailsDrawer: React.FC<{
  closeDrawer: () => void;
  annotation: CampMapAnnotationPoint | CampMapAnnotationPolygon;
}> = ({ closeDrawer, annotation }) => {
  // Placeholder for related camp programs at this location
  const relatedPrograms: CampProgramEntry[] = [
    {
      id: 'yoga-session-1',
      title: 'Morning Yoga Flow',
      time: '09:00 - 10:00',
      description:
        'Start your day with an invigorating yoga session suitable for all levels, focusing on breath and movement to awaken your body and mind.',
    },
    {
      id: 'meditation-workshop',
      title: 'Mindfulness Meditation',
      time: '11:00 - 12:00',
      description:
        'A guided meditation to calm your mind and reduce stress. Learn simple techniques to bring mindfulness into your daily life and find inner peace.',
    },
    {
      id: 'evening-stretch',
      title: 'Evening Stretch & Relax',
      time: '18:00 - 19:00',
      description:
        'Unwind with gentle stretches before dinner. This session focuses on flexibility and relaxation, perfect for releasing tension after a day of activities.',
    },
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
          {annotation.openingHours && annotation.openingHours.length > 0 && (
            <div className="border-b border-gray-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Clock size={18} className="text-gray-600" />
                <h3 className="font-semibold text-gray-900">Opening Hours</h3>
              </div>
              <ul className="list-disc pl-5">
                {annotation.openingHours.map((entry, index) => (
                  <li key={index} className="text-gray-700">
                    {/* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions */}
                    {entry.day
                      ? `${entry.day.charAt(0).toUpperCase() + entry.day.slice(1)}: `
                      : 'Daily: '}
                    {entry.time}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Images */}
          <div className="border-b border-gray-50 p-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {annotation.images.length > 0 &&
                annotation.images.map((image, index) => (
                  <Suspense
                    key={index}
                    fallback={<div className="h-24 w-24 rounded-lg bg-gray-200" />}
                  >
                    <Image
                      src={image.url ?? ''}
                      alt={image.alt}
                      width={96}
                      height={96}
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  </Suspense>
                ))}
            </div>
          </div>

          {/* Related Programs Section */}
          {relatedPrograms.length > 0 && (
            <div className="border-b border-gray-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-600"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <h3 className="font-semibold text-gray-900">Programs at this Location</h3>
              </div>
              <div className="space-y-3">
                {relatedPrograms.map((program) => (
                  <div key={program.id} className="rounded-lg border border-gray-200 p-3">
                    <h4 className="font-medium text-gray-900">{program.title}</h4>
                    <p className="text-sm text-gray-600">{program.time}</p>
                    <p className="mt-1 text-sm text-gray-700">{program.description}</p>
                    <a
                      href={`/app/schedule/${program.id}`}
                      className="mt-3 inline-flex items-center rounded-md border border-transparent bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                    >
                      Read More
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

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
