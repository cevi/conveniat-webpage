'use client';

import { cn } from '@/utils/tailwindcss-override';
import { Tab, TabList } from '@headlessui/react';
import type React from 'react';

/**
 * The dashboard's sections, within a Headless UI TabGroup. On a wide screen a column on the
 * left, each section with what is still open behind it; on a narrow one a row of pills that
 * wraps rather than hiding sections behind a scroll. The keyboard moves with the arrow keys.
 */
export const DashboardTabList: React.FC<{
  tabs: {
    label: string;
    /** An icon or the area's dot in front of the label. */
    marker: React.ReactNode;
    open?: number;
    openLabel?: string;
  }[];
  label: string;
}> = ({ tabs, label }) => (
  <TabList
    aria-label={label}
    className="flex flex-wrap gap-1 rounded-3xl bg-gray-100 p-1 @min-[900px]/dashboard:flex-col @min-[900px]/dashboard:flex-nowrap @min-[900px]/dashboard:rounded-none @min-[900px]/dashboard:bg-transparent @min-[900px]/dashboard:p-0"
  >
    {tabs.map((tab) => (
      <Tab
        key={tab.label}
        className={cn(
          'inline-flex min-h-11 grow cursor-pointer items-center justify-center gap-2.5 rounded-full px-4 text-sm font-medium whitespace-nowrap text-green-700 outline-hidden transition-colors hover:text-green-900 data-focus:ring-2 data-focus:ring-green-600 data-focus:ring-inset data-selected:bg-white data-selected:text-green-900 data-selected:shadow-sm',
          '@min-[900px]/dashboard:data-selected:border-line @min-[900px]/dashboard:min-h-12 @min-[900px]/dashboard:grow-0 @min-[900px]/dashboard:justify-start @min-[900px]/dashboard:rounded-xl @min-[900px]/dashboard:border @min-[900px]/dashboard:border-transparent @min-[900px]/dashboard:px-4 @min-[900px]/dashboard:text-base @min-[900px]/dashboard:hover:bg-white/60 @min-[900px]/dashboard:data-selected:font-semibold @min-[900px]/dashboard:data-selected:shadow-none',
        )}
      >
        <span className="hidden w-4 shrink-0 justify-center @min-[900px]/dashboard:flex">
          {tab.marker}
        </span>
        {tab.label}
        {tab.open !== undefined && tab.open > 0 && (
          <>
            <span
              aria-hidden
              className="bg-conveniat-green inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white tabular-nums @min-[900px]/dashboard:ml-auto"
            >
              {tab.open}
            </span>
            {/* a label on a plain span is not read out; the words are */}
            <span className="sr-only">{tab.openLabel}</span>
          </>
        )}
      </Tab>
    ))}
  </TabList>
);
