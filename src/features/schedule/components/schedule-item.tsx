'use client';

import { StarButton } from '@/components/star/star';
import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import { EnrollmentAction } from '@/features/schedule/components/enrollment-action';
import { scheduleLabels } from '@/features/schedule/constants/schedule-labels';
import { useScrollRestoration } from '@/features/schedule/hooks/use-scroll-restoration';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { getCategoryDisplayData } from '@/features/schedule/utils/category-utils';
import { useStar } from '@/hooks/use-star';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CheckCircle, ChevronRight, Clock, MapPin } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import type React from 'react';

interface ScheduleItemProperties {
  entry: CampScheduleEntryFrontendType;
  isEnrolled: boolean;
  onMapClick: (location: CampMapAnnotation) => void;
}

export const ScheduleItem: React.FC<ScheduleItemProperties> = ({
  entry,
  isEnrolled,
  onMapClick,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const searchParameters = useSearchParams();
  const { isStarred, toggleStar } = useStar();
  const { saveScrollPosition } = useScrollRestoration();
  const location = entry.location as CampMapAnnotation;
  const currentlyStarred = isStarred(entry.id);

  const { label: categoryLabel, className: categoryClassName } = getCategoryDisplayData(
    entry.category,
  );

  const hasEnrollment = entry.enable_enrolment === true;
  const href = `/app/schedule/${entry.id}?${searchParameters.toString()}`;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-200',
        'hover:border-gray-300 hover:shadow-md',
        isEnrolled && 'border-conveniat-green/50 bg-green-50/30',
        !isEnrolled && 'border-gray-200',
      )}
    >
      {/* Clickable header area - Wrapped in Link for soft navigation */}
      <Link
        href={href}
        onClick={saveScrollPosition}
        className={cn('block cursor-pointer p-4', hasEnrollment && 'pb-2')}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Category Tag */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {categoryLabel && (
                <span
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                    categoryClassName,
                  )}
                >
                  {categoryLabel}
                </span>
              )}
              {isEnrolled && (
                <span className="bg-conveniat-green flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                  <CheckCircle className="h-3 w-3" />
                  {scheduleLabels.enrolledBadge[locale]}
                </span>
              )}
            </div>

            <h3 className="group-hover:text-conveniat-green mb-1 text-base leading-snug font-semibold text-gray-900 transition-colors">
              {entry.title}
            </h3>

            {/* Info Row: Time & Location */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-medium text-gray-700">{entry.timeslot.time}</span>
              </div>

              {location.title !== '' && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {/* Prevent link navigation when clicking map pin */}
                  <button
                    onClick={(event) => {
                      event.preventDefault(); // Prevent Link navigation
                      event.stopPropagation();
                      onMapClick(location);
                    }}
                    className="hover:text-conveniat-green relative z-10 font-medium hover:underline"
                  >
                    {location.title}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right side: Star and chevron */}
          <div className="flex items-center gap-1">
            <StarButton
              id={entry.id}
              isStared={currentlyStarred}
              toggleStar={toggleStar}
              isLocked={isEnrolled}
            />
            <ChevronRight className="h-5 w-5 text-gray-300 transition-colors group-hover:text-gray-500" />
          </div>
        </div>
      </Link>

      {/* Enrollment action area - only shown when enrollment is enabled */}
      {hasEnrollment && (
        <div
          className="border-t border-gray-100 px-4 py-3"
          onClick={(event) => event.stopPropagation()}
        >
          <EnrollmentAction courseId={entry.id} />
        </div>
      )}
    </div>
  );
};
