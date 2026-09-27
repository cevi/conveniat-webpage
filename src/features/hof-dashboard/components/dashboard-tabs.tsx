'use client';

import { Tab, TabList } from '@headlessui/react';
import type React from 'react';

/**
 * The dashboard's tabs, within a Headless UI TabGroup, in the pill style of the site's tabs
 * block. Every tab stays in view: on a narrow screen the row wraps rather than hiding tabs
 * behind a scroll. A tab can carry how much is still open behind it. The keyboard moves with
 * the arrow keys.
 */
export const DashboardTabList: React.FC<{
  tabs: { label: string; open?: number; openLabel?: string }[];
  label: string;
}> = ({ tabs, label }) => (
  <TabList
    aria-label={label}
    className="flex flex-wrap gap-1 rounded-3xl bg-gray-100 p-1 @3xl:inline-flex @3xl:rounded-full"
  >
    {tabs.map((tab) => (
      <Tab
        key={tab.label}
        className="inline-flex min-h-10 grow cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap text-gray-500 outline-hidden transition-colors hover:text-gray-900 data-focus:ring-2 data-focus:ring-green-600 data-focus:ring-inset data-selected:bg-white data-selected:text-gray-900 data-selected:shadow-sm @3xl:grow-0 @3xl:px-5"
      >
        {tab.label}
        {tab.open !== undefined && tab.open > 0 && (
          <>
            <span
              aria-hidden
              className="bg-conveniat-green inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white tabular-nums"
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
