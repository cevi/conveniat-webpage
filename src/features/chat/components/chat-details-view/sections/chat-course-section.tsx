import { Button } from '@/components/ui/buttons/button';
import { SectionLabel } from '@/components/ui/section-label';
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
  shiftLink: {
    de: 'Zum Schichteinsatz',
    en: 'Go to the shift',
    fr: 'Aller au service',
  },
  shiftDescription: {
    de: 'Details zu diesem Schichteinsatz im Helferportal ansehen.',
    en: 'View details about this shift in the helper portal.',
    fr: 'Voir les détails de ce service dans le portail des helpers.',
  },
  shiftSectionTitle: {
    de: 'Schichteinsatz',
    en: 'Shift',
    fr: 'Service',
  },
} as const;

interface ChatCourseSectionProperties {
  courseId: string;
  /** a Schichteinsatz opens in the helper portal, a programme block in the schedule */
  isShift: boolean;
  locale: Locale;
}

export const ChatCourseSection: React.FC<ChatCourseSectionProperties> = ({
  courseId,
  isShift,
  locale,
}) => {
  return (
    <section>
      <SectionLabel>
        {(isShift ? labels.shiftSectionTitle : labels.sectionTitle)[locale]}
      </SectionLabel>
      <div className="border-line mt-2 rounded-[14px] border bg-white p-4">
        <p className="mb-3 text-[15px] text-green-700">
          {(isShift ? labels.shiftDescription : labels.description)[locale]}
        </p>
        <Button variant="outlined" size="touch" className="w-full" asChild>
          <Link
            href={isShift ? `/app/helper-portal?id=${courseId}` : `/app/schedule?id=${courseId}`}
          >
            <Calendar aria-hidden="true" />
            {(isShift ? labels.shiftLink : labels.courseLink)[locale]}
          </Link>
        </Button>
      </div>
    </section>
  );
};
