'use client';

import type { HelperShiftFrontendType } from '@/features/schedule/api/get-helper-shifts';
import { ShiftEnrollmentAction } from '@/features/schedule/components/shift-enrollment-action';
import type { Locale, StaticTranslationString } from '@/types/types';
import { ChevronDown, ChevronUp, Clock, MapPin, Users } from 'lucide-react';
import React, { useState } from 'react';

const meetingPointLabel: StaticTranslationString = {
  en: 'Meeting point:',
  de: 'Treffpunkt:',
  fr: 'Point de rendez-vous:',
};

const maxHelpersLabel: StaticTranslationString = {
  en: 'Max. helpers:',
  de: 'Max. Helfende:',
  fr: 'Helpers max.:',
};

const detailsLabel: StaticTranslationString = {
  en: 'Detailed Description',
  de: 'Detailierte Beschreibung',
  fr: 'Description détaillée',
};

/**
 * Individual shift card displayed in the helper portal.
 * Handles the expand/collapse state for detailed content on the client.
 */
export const ShiftCard: React.FC<{
  shift: HelperShiftFrontendType;
  locale: Locale;
  children?: React.ReactNode;
}> = ({ shift, locale, children }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-gray-900">{shift.title}</h3>
        {shift.description && <p className="mt-1 text-sm text-gray-500">{shift.description}</p>}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {shift.timeslot.time}
        </span>
        {shift.meetingPoint && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {meetingPointLabel[locale]} {shift.meetingPoint}
          </span>
        )}
        {shift.participants_max != undefined && (
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {maxHelpersLabel[locale]} {shift.participants_max}
          </span>
        )}
      </div>

      <ShiftEnrollmentAction shiftId={shift.id} enableEnrolment={shift.enable_enrolment} />

      {children && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-between text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            {detailsLabel[locale]}
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {isExpanded && <div className="mt-4 sm:mr-[-1.5rem] sm:ml-[-1.5rem]">{children}</div>}
        </div>
      )}
    </div>
  );
};
