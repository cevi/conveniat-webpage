'use client';

import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';
import { useRef } from 'react';

import { useScrollEdges } from '@/features/hof-dashboard/hooks/use-scroll-edges';

/** The id of a tab's button and of its panel, so each can name the other. */
export const tabIds = (id: string): { tab: string; panel: string } => ({
  tab: `hof-dashboard-tab-${id}`,
  panel: `hof-dashboard-panel-${id}`,
});

/**
 * A row of tabs that scrolls sideways instead of wrapping. Only the selected tab is a tab stop;
 * the arrow keys, Home and End move between the tabs, as the ARIA tabs pattern expects.
 */
export const DashboardTabs = <T extends string>({
  tabs,
  selected,
  label,
  onSelect,
}: {
  tabs: { id: T; label: string }[];
  selected: T;
  label: string;
  onSelect: (id: T) => void;
}): React.ReactElement => {
  const buttons = useRef(new Map<T, HTMLButtonElement>());
  const row = useRef<HTMLDivElement>(null);
  const edges = useScrollEdges(row);

  const select = (id: T): void => {
    onSelect(id);
    // a tab chosen at the edge of a narrow row scrolls fully into view
    buttons.current.get(id)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const focusTab = (index: number): void => {
    const target = tabs.at(index % tabs.length);
    if (target === undefined) return;
    select(target.id);
    buttons.current.get(target.id)?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number): void => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    focusTab(next);
  };

  return (
    <div
      ref={row}
      role="tablist"
      aria-label={label}
      className={cn(
        '-mx-1 flex [scrollbar-width:none] overflow-x-auto border-b border-gray-200 px-1',
        // fade out the side where tabs are hidden, so the row reads as scrollable
        edges.start &&
          edges.end &&
          '[mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)]',
        edges.start &&
          !edges.end &&
          '[mask-image:linear-gradient(to_right,transparent,black_2rem)]',
        !edges.start && edges.end && '[mask-image:linear-gradient(to_left,transparent,black_2rem)]',
      )}
    >
      {tabs.map((tab, index) => {
        const isSelected = tab.id === selected;
        const ids = tabIds(tab.id);
        return (
          <button
            key={tab.id}
            ref={(element) => {
              if (element === null) buttons.current.delete(tab.id);
              else buttons.current.set(tab.id, element);
            }}
            id={ids.tab}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={ids.panel}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => select(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              '-mb-px min-h-11 shrink-0 cursor-pointer border-b-2 px-3 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-green-600',
              isSelected
                ? 'border-conveniat-green text-conveniat-green'
                : 'border-transparent text-gray-600 hover:text-gray-900',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
