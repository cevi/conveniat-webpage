'use client';

import { cn } from '@/utils/tailwindcss-override';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type React from 'react';
import { useRef } from 'react';

import { useScrollEdges } from '@/features/hof-dashboard/hooks/use-scroll-edges';

/**
 * The id of a tab's button and of its panel, so each can name the other. `prefix` keeps them
 * apart when the dashboards of several Höfe are on the page.
 */
export const tabIds = (prefix: string, id: string): { tab: string; panel: string } => ({
  tab: `${prefix}-tab-${id}`,
  panel: `${prefix}-panel-${id}`,
});

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
          ? 'right-0 justify-end bg-linear-to-l from-slate-50 from-60% to-transparent'
          : 'left-0 justify-start bg-linear-to-r from-slate-50 from-60% to-transparent',
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
};

/**
 * A row of tabs that scrolls sideways instead of wrapping. Only the selected tab is a tab stop;
 * the arrow keys, Home and End move between the tabs, as the ARIA tabs pattern expects.
 */
export const DashboardTabs = <T extends string>({
  tabs,
  idPrefix,
  selected,
  label,
  onSelect,
}: {
  tabs: { id: T; label: string }[];
  idPrefix: string;
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

  /** Moves the row by about one tab, for pointers; the keyboard has the arrow keys. */
  const scrollBy = (direction: 1 | -1): void =>
    row.current?.scrollBy({ left: direction * 120, behavior: 'smooth' });

  return (
    <div className="relative">
      {/* the row is wider than the column on phones and desktops alike, so where tabs are
          hidden an arrow says so and brings them in */}
      {edges.start && <ScrollButton direction={-1} onClick={() => scrollBy(-1)} />}
      {edges.end && <ScrollButton direction={1} onClick={() => scrollBy(1)} />}
      <div
        ref={row}
        role="tablist"
        aria-label={label}
        className="-mx-1 flex [scrollbar-width:none] overflow-x-auto border-b border-gray-200 px-1"
      >
        {tabs.map((tab, index) => {
          const isSelected = tab.id === selected;
          const ids = tabIds(idPrefix, tab.id);
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
    </div>
  );
};
