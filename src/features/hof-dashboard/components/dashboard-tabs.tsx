'use client';

import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import { cn } from '@/utils/tailwindcss-override';
import { Tab, TabList } from '@headlessui/react';
import type React from 'react';

/**
 * The dashboard's sections, within a Headless UI TabGroup, as a segmented control with what
 * is still open behind each section. Where the row does not fit it scrolls sideways rather
 * than wrapping into a second track. The keyboard moves with the arrow keys.
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
    className={cn(segmentedTrackClassName, 'w-fit max-w-full overflow-x-auto')}
  >
    {tabs.map((tab) => (
      <Tab
        key={tab.label}
        className={({ selected }) =>
          cn(
            segmentClassName(selected),
            'shrink-0 gap-2 px-3 text-sm whitespace-nowrap',
            selected && 'font-semibold',
          )
        }
      >
        <span className="hidden w-4 shrink-0 justify-center @xl/dashboard:flex">{tab.marker}</span>
        {tab.label}
        {tab.open !== undefined && tab.open > 0 && (
          <>
            <span
              aria-hidden
              className="bg-chip text-heading inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums"
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
