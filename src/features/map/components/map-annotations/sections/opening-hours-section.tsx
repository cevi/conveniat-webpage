import { SectionLabel } from '@/components/ui/section-label';
import type { CampMapAnnotation as CampMapAnnotationPayloadDocumentType } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';

type OpeningHours = NonNullable<CampMapAnnotationPayloadDocumentType['openingHours']>;
type Weekday = NonNullable<OpeningHours[number]['day']>;

interface AnnotationOpeningHoursSectionProperties {
  openingHours: CampMapAnnotationPayloadDocumentType['openingHours'];
  locale: Locale;
}

const openingHoursText: StaticTranslationString = {
  de: 'Öffnungszeiten',
  en: 'Opening Hours',
  fr: "Heures d'ouverture",
};

const dailyText: StaticTranslationString = {
  de: 'Täglich',
  en: 'Daily',
  fr: 'Tous les jours',
};

const weekdayText: Record<Weekday, StaticTranslationString> = {
  monday: { de: 'Montag', en: 'Monday', fr: 'Lundi' },
  tuesday: { de: 'Dienstag', en: 'Tuesday', fr: 'Mardi' },
  wednesday: { de: 'Mittwoch', en: 'Wednesday', fr: 'Mercredi' },
  thursday: { de: 'Donnerstag', en: 'Thursday', fr: 'Jeudi' },
  friday: { de: 'Freitag', en: 'Friday', fr: 'Vendredi' },
  saturday: { de: 'Samstag', en: 'Saturday', fr: 'Samedi' },
  sunday: { de: 'Sonntag', en: 'Sunday', fr: 'Dimanche' },
};

/** When a place is open, one row per day with its hours, like the programme at the place. */
export const AnnotationOpeningHoursSection: React.FC<AnnotationOpeningHoursSectionProperties> = ({
  openingHours,
  locale,
}) => {
  if (!openingHours || openingHours.length === 0) return <></>;
  return (
    <section className="pt-3 pb-4">
      <SectionLabel as="h3">{openingHoursText[locale]}</SectionLabel>
      <ul className="mt-1">
        {openingHours.map((entry, index) => (
          <li
            key={entry.id ?? index}
            className="border-line flex min-h-11 items-center justify-between gap-3 border-b py-2 text-[15px] last:border-b-0"
          >
            <span className="text-green-700">
              {entry.day ? weekdayText[entry.day][locale] : dailyText[locale]}
            </span>
            <span className="font-semibold text-green-900 tabular-nums">{entry.time}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};
