'use client';

import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import { useTRPC } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type React from 'react';

/** The query parameter that opens "Mein Hof" instead of the shifts of a day. */
export const HOF_VIEW_PARAMETER = 'ansicht';
export const HOF_VIEW_VALUE = 'hof';

const shiftsLabel: StaticTranslationString = {
  de: 'Einsätze',
  en: 'Shifts',
  fr: 'Services',
};

const hofLabel: StaticTranslationString = {
  de: 'Mein Hof',
  en: 'My Hof',
  fr: 'Mon Hof',
};

/**
 * "Einsätze | Mein Hof" above the Schichteinsätze, for the AVP of a Hof only; everybody else
 * sees the shifts as before. A link rather than state, so the back gesture returns to the list.
 */
export const ShiftsViewSwitch: React.FC<{ locale: Locale }> = ({ locale }) => {
  const trpc = useTRPC();
  const pathname = usePathname();
  const searchParameters = useSearchParams();
  const { data } = useQuery(trpc.shifts.getHofShiftOverview.queryOptions());
  // a persisted cache from an older build may hold another shape
  const isAvp = Array.isArray(data?.hoefe) && data.hoefe.length > 0;
  if (!isAvp) return <></>;

  const isHofView = searchParameters.get(HOF_VIEW_PARAMETER) === HOF_VIEW_VALUE;
  const segments = [
    { label: shiftsLabel[locale], href: pathname, isChosen: !isHofView },
    {
      label: hofLabel[locale],
      href: `${pathname}?${HOF_VIEW_PARAMETER}=${HOF_VIEW_VALUE}`,
      isChosen: isHofView,
    },
  ];

  return (
    // the same width and side padding as the page under it, which brings its own top padding
    <nav
      className={cn(segmentedTrackClassName, 'mx-4 mt-4 sm:mx-6 sm:mt-6 xl:mx-auto xl:max-w-2xl')}
    >
      {segments.map((segment) => (
        <Link
          key={segment.label}
          href={segment.href}
          replace
          aria-current={segment.isChosen ? 'page' : undefined}
          className={cn(segmentClassName(segment.isChosen), 'flex-1 text-[15px] font-semibold')}
        >
          {segment.label}
        </Link>
      ))}
    </nav>
  );
};
