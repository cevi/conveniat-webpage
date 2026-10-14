import type { CampMapAnnotation as CampMapAnnotationPayloadDocumentType } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Clock } from 'lucide-react';
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

export const AnnotationOpeningHoursSection: React.FC<AnnotationOpeningHoursSectionProperties> = ({
  openingHours,
  locale,
}) => {
  if (!openingHours || openingHours.length === 0) return <></>;
  return (
    <div className="border-b-2 border-gray-100 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Clock size={18} className="text-gray-600" />
        <h3 className="font-semibold text-gray-900">{openingHoursText[locale]}</h3>
      </div>
      <ul className="list-disc pl-5">
        {openingHours.map((entry, index) => (
          <li key={index} className="text-gray-700">
            {entry.day ? weekdayText[entry.day][locale] : dailyText[locale]}: {entry.time}
          </li>
        ))}
      </ul>
    </div>
  );
};
