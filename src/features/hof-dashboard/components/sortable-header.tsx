'use client';

import type { TableSort } from '@/features/hof-dashboard/hooks/use-table-sort';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type React from 'react';

/**
 * A column head that sorts its table: the whole label is the button, the arrow shows the
 * direction, and a column that could sort shows a faint double arrow. `aria-sort` tells a
 * screen reader which column the table is sorted by.
 */
export const SortableHeader = <Key extends string>({
  sortKey,
  sort,
  onSort,
  align = 'left',
  className,
  children,
}: {
  sortKey: Key;
  sort: TableSort<Key> | undefined;
  onSort: (key: Key) => void;
  align?: 'left' | 'right';
  className?: string | undefined;
  children: React.ReactNode;
}): React.ReactNode => {
  const active = sort?.key === sortKey;
  let Icon = ArrowUpDown;
  if (active) Icon = sort.direction === 'ascending' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? sort.direction : undefined}
      className={cn('px-0 py-0 align-bottom', className)}
    >
      <button
        type="button"
        className={cn(
          // a button drops the case and spacing of the head it sits in; it keeps them here
          'group flex min-h-11 w-full cursor-pointer items-end gap-1 px-3 py-3 [letter-spacing:inherit] [text-transform:inherit] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-green-600',
          align === 'right' ? 'justify-end text-right' : 'justify-start text-left',
        )}
        onClick={() => onSort(sortKey)}
      >
        <span className={cn(align === 'right' && 'order-last')}>{children}</span>
        <Icon
          aria-hidden
          className={cn(
            'mb-px h-3.5 w-3.5 shrink-0',
            active ? 'text-green-900' : 'text-gray-300 group-hover:text-green-600',
          )}
        />
      </button>
    </th>
  );
};
