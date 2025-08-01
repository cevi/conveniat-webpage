import type { CampScheduleEntry } from '@/features/map/types/types';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

const scheduleTableTitle: StaticTranslationString = {
  de: 'Programme an diesem Ort',
  en: 'Programs at this location',
  fr: 'Programmes à cet endroit',
};

export const AnnotationScheduleTableComponent: React.FC<{
  schedule: CampScheduleEntry[] | undefined;
  locale: Locale;
}> = ({ schedule, locale }) => {
  console.log(schedule);

  if (!schedule || schedule.length === 0) return <></>;

  return (
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
        <h3 className="font-semibold text-gray-900">{scheduleTableTitle[locale]}</h3>
      </div>
      <div className="space-y-3">
        {schedule.map((entry) => (
          <div key={entry.id} className="rounded-lg border border-gray-200 p-3">
            <h4 className="font-medium text-gray-900">{entry.title}</h4>
            <p className="mt-1 text-sm text-gray-700">
              <ErrorBoundary fallback={<span>Error loading schedule entry.</span>}>
                <LexicalRichTextSection
                  richTextSection={entry.description as SerializedEditorState}
                />
              </ErrorBoundary>
            </p>
            <p className="mt-1 text-sm text-gray-700">{entry.participants_min}</p>
            <a
              href={`/app/schedule/${entry.id}`}
              className="mt-3 inline-flex items-center rounded-md border border-transparent bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            >
              Read More
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};
