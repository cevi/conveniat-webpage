import { MaterialItemImage } from '@/features/material/components/material-item-image';
import {
  isRoutineItemStatus,
  ItemStatusBadge,
} from '@/features/material/components/material-status-badge';
import { MaterialStockBar } from '@/features/material/components/material-stock-bar';
import type { MaterialItemStatus, StockSummary } from '@/features/material/utils/stock';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import Link from 'next/link';
import type React from 'react';

/** The numbers of an article both lists show; the catalogue's query has no more than these. */
export interface ItemRowItem {
  code: string;
  name: string;
  imageUrl: string | null;
  unit: string;
  category: { name: string };
  totalQuantity: number;
  maxLoanQuantity: number;
  damagedQuantity: number;
  inRepairQuantity: number;
  stock: StockSummary;
  status: MaterialItemStatus;
}

/**
 * The rows of an article list: one column on a phone, two once the list is wide enough, with
 * the same hairline between the rows either way. The list needs `@container` around it.
 */
export const itemListClass = 'grid @xl:grid-cols-2 -mb-px';

/**
 * One article in a list, the same for the material team's inventory and everybody's
 * catalogue: photo, name, shelf and the stock bar, with a badge only when something is off.
 * `meta` adds to the shelf line and `action` sits beside the stock figures, where the numbers
 * it depends on are. The name's link covers the whole row, the action sits above it.
 */
export const ItemRow: React.FC<{
  item: ItemRowItem;
  href: string;
  locale: Locale;
  meta?: string;
  action?: React.ReactNode;
  /** see `MaterialStockBar` */
  breakdown?: boolean;
}> = ({ item, href, locale, meta, action, breakdown = true }) => (
  <li
    className={cn(
      'relative flex gap-3 border-b border-gray-100 px-4 py-3 hover:bg-gray-50 @xl:odd:border-r',
      'has-[a:focus-visible]:ring-conveniat-green has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset',
    )}
  >
    <MaterialItemImage name={item.name} imageUrl={item.imageUrl} className="size-14" />
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {/* wraps instead of truncating: "Kompass R…" and "Kompass S…" look alike */}
          <Link
            href={href}
            title={item.name}
            className="line-clamp-2 font-semibold break-words hyphens-auto text-gray-900 after:absolute after:inset-0 focus-visible:outline-none"
          >
            {item.name}
          </Link>
          <p className="truncate text-xs text-gray-500">
            {item.category.name}
            {meta !== undefined && ` · ${meta}`}
          </p>
        </div>
        {!isRoutineItemStatus(item.status) && (
          <ItemStatusBadge status={item.status} locale={locale} />
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-end justify-end gap-x-3 gap-y-2">
        {/* narrow enough that the round "+" or a short "why not" fits beside it on a 360 px
            phone; the wider stepper wraps below */}
        <div className="min-w-28 flex-1">
          <MaterialStockBar
            stock={item.stock}
            totalQuantity={item.totalQuantity}
            unavailable={item.damagedQuantity + item.inRepairQuantity}
            unit={item.unit}
            locale={locale}
            maxPerLoan={item.maxLoanQuantity}
            breakdown={breakdown}
          />
        </div>
        {action !== undefined && <div className="relative z-10 shrink-0">{action}</div>}
      </div>
    </div>
  </li>
);
