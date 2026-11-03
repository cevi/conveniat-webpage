import { segmentedTrackClassName } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { LABEL_CLASS, Panel } from '@/features/hof-dashboard/components/dashboard-ui';
import { HOF_DASHBOARD_AREA_LABELS, HOF_DASHBOARD_AREAS } from '@/features/hof-dashboard/constants';
import { formatCountdown, formatDate, translate } from '@/features/hof-dashboard/texts';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/**
 * The placeholders take the frames of what replaces them: the same cards, gaps and container
 * queries as the overview of a Hof (overview-view.tsx), the screen most people land on. Only
 * the words inside pulse, so nothing moves when the data arrives.
 */

/** The line under the page's title that names the Hof's AVP. */
export const ResponsibleLineSkeleton: React.FC = () => (
  <div className="flex h-[22.5px] items-center">
    <Skeleton className="h-4 w-72 max-w-full" />
  </div>
);

/**
 * Words as a placeholder: the real text in the real type, invisible on the pulsing grey, so it
 * takes the height and wraps into the lines the loaded text will, at every width and with the
 * larger type on a desktop.
 */
const Words: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <span
    className={cn(
      'bg-quiet animate-pulse rounded-md box-decoration-clone text-transparent',
      className,
    )}
  >
    {children}
  </span>
);

/** The card of what is still open and how far each area is, in overview-view.tsx's markup. */
const StatsSkeleton: React.FC<{ locale: Locale }> = ({ locale }) => (
  <Panel className="divide-line grid divide-y p-0 @min-[640px]:auto-cols-fr @min-[640px]:grid-flow-col @min-[640px]:divide-x @min-[640px]:divide-y-0 @xl:p-0">
    <div className="space-y-1 p-5 @xl:p-6">
      <p className={LABEL_CLASS}>
        <Words>{translate('stillOpen', locale)}</Words>
      </p>
      <p className="flex items-baseline gap-2">
        <Words className="font-heading text-4xl leading-none font-extrabold">00</Words>
        <Words className="text-base font-medium">{translate('submissionMany', locale)}</Words>
      </p>
      <p className="text-sm">
        <Words>
          {translate('nextDeadline', locale)}{' '}
          <span className="font-semibold">{formatDate('2027-01-31', locale)}</span> ·{' '}
          {formatCountdown(90, locale)}
        </Words>
      </p>
    </div>
    {HOF_DASHBOARD_AREAS.map((area) => (
      <div key={area} className="space-y-3 p-5 @xl:p-6">
        <span className="flex items-center gap-2 text-base font-semibold">
          <Skeleton className="h-4 w-4 shrink-0" />
          <Words>{HOF_DASHBOARD_AREA_LABELS[area][locale]}</Words>
        </span>
        <span className="block text-sm">
          <Words>{translate('progressCount', locale, { done: 0, total: 0 })}</Words>
        </span>
        <Skeleton className="h-1.5 rounded-full" />
      </div>
    ))}
  </Panel>
);

const RowSkeleton: React.FC = () => (
  <li className="flex items-center gap-3 px-5 py-4 @xl:px-6">
    <div className="min-w-0 flex-1 space-y-2">
      <Skeleton className="h-5 w-3/5" />
      <Skeleton className="h-4 w-2/5" />
    </div>
    <Skeleton className="h-11 w-32 shrink-0 rounded-lg" />
  </li>
);

/** The row of tabs, as wide as dashboard-tabs.tsx makes it with the same labels. */
const TabsSkeleton: React.FC<{ locale: Locale }> = ({ locale }) => (
  <div className={cn(segmentedTrackClassName, 'w-fit max-w-full animate-pulse overflow-hidden')}>
    {[
      translate('tabOverview', locale),
      ...HOF_DASHBOARD_AREAS.map((area) => HOF_DASHBOARD_AREA_LABELS[area][locale]),
      translate('tabDocuments', locale),
    ].map((label) => (
      <span
        key={label}
        className="flex shrink-0 items-center gap-2 px-3 text-sm whitespace-nowrap text-transparent"
      >
        <span className="hidden w-4 @xl/dashboard:block" />
        {label}
      </span>
    ))}
  </div>
);

/** One Hof's tabs and its overview, while its data loads. */
export const HofSkeleton: React.FC<{ locale: Locale }> = ({ locale }) => (
  <div className="space-y-6" role="status">
    <TabsSkeleton locale={locale} />
    <div className="@container min-w-0">
      <div className="space-y-6">
        <StatsSkeleton locale={locale} />
        <div className="grid items-start gap-6 @min-[760px]:grid-cols-[minmax(0,1fr)_minmax(15rem,18rem)]">
          <Panel className="p-0 @xl:p-0">
            <div className="px-5 pt-5 pb-4 @xl:px-6 @xl:pt-6">
              <Skeleton className="h-7 w-48" />
            </div>
            <ul className="divide-line border-line divide-y border-t">
              <RowSkeleton />
              <RowSkeleton />
              <RowSkeleton />
            </ul>
          </Panel>
          <Panel className="space-y-5">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-full" />
          </Panel>
        </div>
      </div>
    </div>
    {/* last, where the gap above it does not count: it takes no room */}
    <span className="sr-only">{translate('loading', locale)}</span>
  </div>
);

/**
 * The whole dashboard before anything is known, which is also what the prerendered page holds.
 * `data-page-bar-pending` holds the place of the bar the dashboard sets above the page's title
 * (page-bar.tsx), so that bar does not push everything down when it arrives.
 */
export const DashboardSkeleton: React.FC<{ locale: Locale }> = ({ locale }) => (
  <div className="space-y-6" data-page-bar-pending>
    <ResponsibleLineSkeleton />
    <HofSkeleton locale={locale} />
  </div>
);
