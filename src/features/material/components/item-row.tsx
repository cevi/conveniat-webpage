import { MaterialItemImage } from '@/features/material/components/material-item-image';
import { ItemStatusBadge } from '@/features/material/components/material-status-badge';
import { MaterialStockBar } from '@/features/material/components/material-stock-bar';
import { focusRing } from '@/features/material/components/material-ui';
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
 * One article in a list, the same for the material team's inventory and everybody's
 * catalogue: photo, name, shelf, status and the stock bar. `meta` adds to the shelf line and
 * `action` sits under the bar; both lists decide what they may show there.
 */
export const ItemRow: React.FC<{
  item: ItemRowItem;
  href: string;
  locale: Locale;
  meta?: string;
  action?: React.ReactNode;
}> = ({ item, href, locale, meta, action }) => (
  <li className="px-4 py-3">
    <Link href={href} className={cn('-m-1 flex gap-3 rounded-lg p-1 hover:bg-gray-50', focusRing)}>
      <MaterialItemImage name={item.name} imageUrl={item.imageUrl} className="size-11" />
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            {/* wraps instead of truncating: "Kompass R…" and "Kompass S…" look alike */}
            <span
              className="line-clamp-2 block font-semibold break-words hyphens-auto text-gray-900"
              title={item.name}
            >
              {item.name}
            </span>
            <span className="block truncate font-mono text-[11px] tracking-wider text-gray-500 uppercase">
              {item.category.name}
              {meta !== undefined && ` · ${meta}`}
            </span>
          </span>
          <ItemStatusBadge status={item.status} locale={locale} />
        </span>
        <MaterialStockBar
          stock={item.stock}
          totalQuantity={item.totalQuantity}
          unavailable={item.damagedQuantity + item.inRepairQuantity}
          unit={item.unit}
          locale={locale}
          maxPerLoan={item.maxLoanQuantity}
        />
      </span>
    </Link>
    {action !== undefined && <div className="mt-2 flex justify-end">{action}</div>}
  </li>
);
