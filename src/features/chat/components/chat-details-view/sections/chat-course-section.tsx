import { Button } from '@/components/ui/buttons/button';
import type { Locale } from '@/types/types';
import { Calendar } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

const labels = {
  courseLink: {
    de: 'Zum Workshop-Eintrag',
    en: 'Go to Workshop Entry',
    fr: "Aller à l'entrée de l'atelier",
  },
  description: {
    de: 'Details zu diesem Workshop im Zeitplan ansehen.',
    en: 'View details about this workshop in the schedule.',
    fr: 'Voir les détails de cet atelier dans le planning.',
  },
  sectionTitle: {
    de: 'Workshop',
    en: 'Workshop',
    fr: 'Atelier',
  },
} as const;

interface ChatCourseSectionProperties {
  courseId: string;
  locale: Locale;
}

export const ChatCourseSection: React.FC<ChatCourseSectionProperties> = ({ courseId, locale }) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">{labels.sectionTitle[locale]}</h2>
      <p className="mb-4 text-sm text-gray-500">{labels.description[locale]}</p>

      <Button variant="outline" className="w-full justify-start gap-2" asChild>
        <Link href={`/app/schedule/${courseId}`}>
          <Calendar className="h-4 w-4" />
          {labels.courseLink[locale]}
        </Link>
      </Button>
    </div>
  );
};
