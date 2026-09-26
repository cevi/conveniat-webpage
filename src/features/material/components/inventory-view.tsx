'use client';

import { CategoriesSheet } from '@/features/material/components/category-sheet';
import { FilterChip, SearchField } from '@/features/material/components/counter-ui';
import { ItemDetailView } from '@/features/material/components/item-detail-view';
import { ItemEditDialog } from '@/features/material/components/item-edit-dialog';
import { ItemRow } from '@/features/material/components/item-row';
import { format, labels } from '@/features/material/components/material-labels';
import { ListPager } from '@/features/material/components/material-list-controls';
import { MaterialQueryError } from '@/features/material/components/material-query-error';
import {
  EmptyState,
  LoadingState,
  MaterialButton,
  Panel,
} from '@/features/material/components/material-ui';
import { usePagination } from '@/features/material/hooks/use-list-state';
import {
  materialQueryOptions,
  useMaterialLocale,
  type MaterialItem,
} from '@/features/material/hooks/use-material';
import { useRoleRoute } from '@/features/material/hooks/use-material-role';
import { catalogItemPath, itemPath, loanPath, parseScan } from '@/features/material/utils/scan';
import { trpc } from '@/trpc/client';
import type { StaticTranslationString } from '@/types/types';
import { AlertTriangle, Plus, Tags } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { useMemo, useRef, useState } from 'react';

const text = {
  search: {
    de: 'Inventar durchsuchen …',
    en: 'Search the inventory …',
    fr: 'Chercher dans l’inventaire …',
  },
  newItem: { de: 'Neuer Artikel', en: 'New item', fr: 'Nouvel article' },
  categories: { de: 'Kategorien', en: 'Categories', fr: 'Catégories' },
  low: { de: 'Knapp', en: 'Low', fr: 'Bas' },
  filters: { de: 'Filter', en: 'Filters', fr: 'Filtres' },
  count: {
    de: '{n} von {total} Artikeln',
    en: '{n} of {total} items',
    fr: '{n} sur {total} articles',
  },
  withHolders: { de: 'bei {n}', en: 'with {n}', fr: 'chez {n}' },
} satisfies Record<string, StaticTranslationString>;

/** Short on stock: nothing free, or no more than the article's warning threshold. */
const isLow = (item: MaterialItem): boolean =>
  !item.isDisabled &&
  (item.stock.available === 0 || item.stock.available <= item.lowStockThreshold);

/** Every article with its stock, found by name, code, shelf or scan, in pages. */
const InventoryList: React.FC = () => {
  const locale = useMaterialLocale();
  const router = useRouter();
  const items = trpc.material.getInventory.useQuery(undefined, materialQueryOptions);
  const categories = trpc.material.getCategoryList.useQuery(undefined, materialQueryOptions);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingCategories, setEditingCategories] = useState(false);
  const listTop = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (items.data ?? []).filter(
      (item) =>
        (needle === '' ||
          item.name.toLowerCase().includes(needle) ||
          item.code.toLowerCase().includes(needle)) &&
        (categoryId === '' || item.category.id === categoryId) &&
        (!onlyLow || isLow(item)),
    );
  }, [items.data, query, categoryId, onlyLow]);
  const pagination = usePagination(
    visible.length,
    JSON.stringify([query.trim(), categoryId, onlyLow]),
  );

  if (items.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!items.data) return <MaterialQueryError error={items.error} />;
  const pageItems = visible.slice(pagination.slice.start, pagination.slice.end);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <MaterialButton onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          {text.newItem[locale]}
        </MaterialButton>
        <MaterialButton variant="secondary" onClick={() => setEditingCategories(true)}>
          <Tags aria-hidden />
          {text.categories[locale]}
        </MaterialButton>
      </div>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder={text.search[locale]}
        onScan={(value) => {
          const scanned = parseScan(value, globalThis.location.origin);
          if (scanned === undefined) return false;
          router.push(scanned.kind === 'item' ? itemPath(scanned.code) : loanPath(scanned.number));
          return true;
        }}
      />
      <div role="group" aria-label={text.filters[locale]} className="flex flex-wrap gap-2">
        <FilterChip active={categoryId === ''} onClick={() => setCategoryId('')}>
          {labels.all[locale]}
        </FilterChip>
        {categories.data?.map((category) => (
          <FilterChip
            key={category.id}
            active={categoryId === category.id}
            onClick={() => setCategoryId(categoryId === category.id ? '' : category.id)}
          >
            {category.name}
          </FilterChip>
        ))}
        <FilterChip active={onlyLow} onClick={() => setOnlyLow(!onlyLow)}>
          <AlertTriangle aria-hidden className="inline" /> {text.low[locale]}
        </FilterChip>
      </div>

      <div ref={listTop} className="@container scroll-mt-20">
        <Panel>
          <p className="border-b border-gray-100 px-4 py-2 text-xs text-gray-500 tabular-nums">
            {format(text.count, locale, { n: visible.length, total: items.data.length })}
          </p>
          {visible.length === 0 && <EmptyState text={labels.empty[locale]} />}
          <ul className="divide-y divide-gray-100">
            {pageItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                href={itemPath(item.code)}
                locale={locale}
                {...(item.outHolders > 0
                  ? { meta: format(text.withHolders, locale, { n: item.outHolders }) }
                  : {})}
              />
            ))}
          </ul>
          <ListPager
            pagination={pagination}
            onNavigate={() => listTop.current?.scrollIntoView({ block: 'start' })}
          />
        </Panel>
      </div>

      {creating && <ItemEditDialog onClose={() => setCreating(false)} />}
      {editingCategories && <CategoriesSheet onClose={() => setEditingCategories(false)} />}
    </div>
  );
};

/**
 * The inventory, or one article in full. Which of the two is decided by `?item=`, the address
 * an article's QR label points to.
 */
export const InventoryPage: React.FC = () => {
  const locale = useMaterialLocale();
  const code = useSearchParams().get('item');
  const hasCode = code !== null && code !== '';
  // a participant who scanned an article label reads it in the catalogue
  const allowed = useRoleRoute('team', hasCode ? catalogItemPath(code) : '/app/material/katalog');
  if (!allowed) return <LoadingState text={labels.loading[locale]} />;
  if (hasCode) return <ItemDetailView key={code} code={code} />;
  return <InventoryList />;
};
