import { SafeErrorBoundary } from '@/components/error-boundary/safe-error-boundary';
import type { CampScheduleEntry } from '@/features/map/types/types';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { Calendar } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

const scheduleTableTitle: StaticTranslationString = {
  de: 'Programme an diesem Ort',
  en: 'Programs at this location',
  fr: 'Programmes à cet endroit',
};

const errorLoadingEntry: StaticTranslationString = {
  de: 'Fehler beim Laden der Programm-Details.',
  en: 'Error loading schedule entry.',
  fr: "Erreur lors du chargement de l'entrée du programme.",
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
          <div key={entry.id} className="cursor-pointer rounded-lg border-2 border-gray-200 p-3">
            <Link href={`/app/schedule/${entry.id}`}>
              <h4 className="font-medium text-gray-900">{entry.title}</h4>
              <div className="mt-1 text-sm text-gray-700">
                <SafeErrorBoundary fallback={<span>{errorLoadingEntry[locale]}</span>}>
                  <LexicalRichTextSection
                    richTextSection={entry.description as SerializedEditorState}
                  />
                </SafeErrorBoundary>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};
