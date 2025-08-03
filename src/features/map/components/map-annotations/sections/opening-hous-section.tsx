import type { CampMapAnnotation as CampMapAnnotationPayloadDocumentType } from '@/features/payload-cms/payload-types';
import { Clock } from 'lucide-react';
import type React from 'react';

interface AnnotationOpeningHoursSectionProperties {
  openingHours: CampMapAnnotationPayloadDocumentType['openingHours'];
}

export const AnnotationOpeningHoursSection: React.FC<AnnotationOpeningHoursSectionProperties> = ({
  openingHours,
}) => {
  if (!openingHours || openingHours.length === 0) return <></>;
  return (
    <div className="border-b-2 border-gray-100 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Clock size={18} className="text-gray-600" />
        <h3 className="font-semibold text-gray-900">Opening Hours</h3>
      </div>
      <ul className="list-disc pl-5">
        {openingHours.map((entry, index) => (
          <li key={index} className="text-gray-700">
            {/* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions */}
            {entry.day ? `${entry.day.charAt(0).toUpperCase() + entry.day.slice(1)}: ` : 'Daily: '}
            {entry.time}
          </li>
        ))}
      </ul>
    </div>
  );
};
