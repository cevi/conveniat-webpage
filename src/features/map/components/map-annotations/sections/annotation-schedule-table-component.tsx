import type { CampScheduleEntry } from '@/features/map/types/types';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { Calendar } from 'lucide-react';
import Link from 'next/link';
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
  if (!schedule || schedule.length === 0) return <></>;

  return (
    <div className="border-b-2 border-gray-100 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-500" />
        <h3 className="font-semibold text-gray-900">{scheduleTableTitle[locale]}</h3>
      </div>
      <div className="space-y-3">
        {schedule.map((entry) => (
          <div key={entry.id} className="rounded-lg border border-gray-200 p-3">
            <h4 className="font-medium text-gray-900">{entry.title}</h4>
            <div className="mt-1 text-sm text-gray-700">
              <ErrorBoundary fallback={<span>Error loading schedule entry.</span>}>
                <LexicalRichTextSection
                  richTextSection={entry.description as SerializedEditorState}
                />
              </ErrorBoundary>
            </div>
            <p className="mt-1 text-sm text-gray-700">{entry.participants_min}</p>
            <Link
              href={`/app/schedule/${entry.id}`}
              className="mt-3 inline-flex items-center rounded-md border border-transparent bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            >
              Read More
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};
