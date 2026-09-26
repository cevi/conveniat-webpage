'use client';

import { useScrollEdges } from '@/features/hof-dashboard/hooks/use-scroll-edges';
import { cn } from '@/utils/tailwindcss-override';
import { Tab, TabList } from '@headlessui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type React from 'react';
import { useRef } from 'react';

/** An arrow over the end of the tab row, on the page's background, that scrolls it along. */
const ScrollButton: React.FC<{ direction: 1 | -1; onClick: () => void }> = ({
  direction,
  onClick,
}) => {
  const Icon = direction === 1 ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      onClick={onClick}
      className={cn(
        'absolute top-0 z-10 flex h-11 w-10 cursor-pointer items-center text-gray-600 hover:text-gray-900',
        direction === 1
          ? '-right-1 justify-end bg-linear-to-l from-slate-50 from-60% to-transparent'
          : '-left-1 justify-start bg-linear-to-r from-slate-50 from-60% to-transparent',
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
};

/**
 * The dashboard's tabs, within a Headless UI TabGroup. The row can be wider than the column,
 * on a phone and on a narrow desktop, so where tabs are hidden an arrow says so and brings
 * them in; the keyboard moves with the arrow keys.
 */
export const DashboardTabList: React.FC<{ labels: string[]; label: string }> = ({
  labels,
  label,
}) => {
  const row = useRef<HTMLDivElement>(null);
  const edges = useScrollEdges(row);
  const scrollBy = (direction: 1 | -1): void =>
    row.current?.scrollBy({ left: direction * 120, behavior: 'smooth' });

  return (
    <div className="relative">
      {edges.start && <ScrollButton direction={-1} onClick={() => scrollBy(-1)} />}
      {edges.end && <ScrollButton direction={1} onClick={() => scrollBy(1)} />}
      <TabList
        ref={row}
        aria-label={label}
        className="-mx-1 flex [scrollbar-width:none] overflow-x-auto border-b border-gray-200 px-1"
      >
        {labels.map((tabLabel) => (
          <Tab
            key={tabLabel}
            className="data-selected:border-conveniat-green data-selected:text-conveniat-green -mb-px min-h-11 shrink-0 cursor-pointer border-b-2 border-transparent px-2.5 text-sm font-semibold whitespace-nowrap text-gray-600 transition-colors hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-green-600"
          >
            {tabLabel}
          </Tab>
        ))}
      </TabList>
    </div>
  );
};
