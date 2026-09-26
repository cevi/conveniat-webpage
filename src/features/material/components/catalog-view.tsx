'use client';

import { LoanRequestDialog } from '@/features/material/components/loan-request-dialog';
import { MaterialItemImage } from '@/features/material/components/material-item-image';
import { format, itemStatusLabel, labels } from '@/features/material/components/material-labels';
import { MaterialQueryError } from '@/features/material/components/material-query-error';
import { ItemStatusBadge } from '@/features/material/components/material-status-badge';
import { MaterialStockBar } from '@/features/material/components/material-stock-bar';
import {
  EmptyState,
  inputClass,
  LoadingState,
  MaterialButton,
  NativeSelect,
  Panel,
  StatTile,
} from '@/features/material/components/material-ui';
import {
  materialQueryOptions,
  useMaterialLocale,
  type MaterialItem,
} from '@/features/material/hooks/use-material';
import type { MaterialItemStatus } from '@/features/material/utils/stock';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowUpRight, LayoutGrid, List, Search } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useMemo, useState } from 'react';

const text = {
  search: { de: 'Artikel suchen …', en: 'Search items …', fr: 'Chercher un article …' },
  allCategories: { de: 'Alle Kategorien', en: 'All categories', fr: 'Toutes les catégories' },
  allStatus: { de: 'Alle Status', en: 'All statuses', fr: 'Tous les statuts' },
  onlyAvailable: {
    de: 'Nur verfügbare Artikel',
    en: 'Only available items',
    fr: 'Articles disponibles seulement',
  },
  onlyReservable: {
    de: 'Nur reservierbare Artikel',
    en: 'Only reservable items',
    fr: 'Articles réservables seulement',
  },
  count: {
    de: '{n} von {total} Artikeln',
    en: '{n} of {total} items',
    fr: '{n} sur {total} articles',
  },
  cards: { de: 'Karten', en: 'Cards', fr: 'Cartes' },
  list: { de: 'Liste', en: 'List', fr: 'Liste' },
  articles: { de: '{n} Artikel', en: '{n} items', fr: '{n} articles' },
  immediately: { de: 'sofort beziehbar', en: 'ready right now', fr: 'disponible tout de suite' },
  reservedHint: { de: '{n} reserviert', en: '{n} reserved', fr: '{n} réservés' },
  brokenHint: {
    de: 'davon {n} in Reparatur',
    en: '{n} of them in repair',
    fr: 'dont {n} en réparation',
  },
  sort: { de: 'Sortierung', en: 'Sort', fr: 'Tri' },
  sortName: { de: 'Name A–Z', en: 'Name A–Z', fr: 'Nom A–Z' },
  sortNameDesc: { de: 'Name Z–A', en: 'Name Z–A', fr: 'Nom Z–A' },
  sortMostFree: { de: 'Meiste frei', en: 'Most free', fr: 'Plus de libres' },
  sortLeastFree: { de: 'Wenigste frei', en: 'Least free', fr: 'Moins de libres' },
} satisfies Record<string, StaticTranslationString>;

type Sort = 'name' | 'nameDesc' | 'mostFree' | 'leastFree';

const SORTS: Record<Sort, (a: MaterialItem, b: MaterialItem) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  nameDesc: (a, b) => b.name.localeCompare(a.name),
  mostFree: (a, b) => b.stock.available - a.stock.available,
  leastFree: (a, b) => a.stock.available - b.stock.available,
};

const sortLabel: Record<Sort, StaticTranslationString> = {
  name: text.sortName,
  nameDesc: text.sortNameDesc,
  mostFree: text.sortMostFree,
  leastFree: text.sortLeastFree,
};

const itemHref = (item: MaterialItem): string =>
  `/app/material/catalog?item=${encodeURIComponent(item.code)}`;

const actionClass = 'shrink-0 px-3 sm:w-28';

/**
 * The main call to action of a row, which depends on who reads and what exists. Everything
 * being out today does not block a reservation for next week; the dialog asks the server what
 * is free for the chosen days.
 */
const ItemAction: React.FC<{
  item: MaterialItem;
  isMaterialTeam: boolean;
  locale: Locale;
  onReserve: (item: MaterialItem) => void;
}> = ({ item, isMaterialTeam, locale, onReserve }) => {
  if (item.isDisabled || item.stock.usable === 0) {
    return (
      <MaterialButton variant="secondary" disabled className={actionClass}>
        {labels.noneFree[locale]}
      </MaterialButton>
    );
  }
  if (!item.isReservable && !isMaterialTeam) {
    return (
      <MaterialButton variant="secondary" disabled className={actionClass}>
        {labels.counterOnly[locale]}
      </MaterialButton>
    );
  }
  return (
    <MaterialButton className={actionClass} onClick={() => onReserve(item)}>
      {isMaterialTeam && !item.isReservable ? labels.handOut[locale] : labels.reserve[locale]}
    </MaterialButton>
  );
};

export const CatalogView: React.FC = () => {
  const locale = useMaterialLocale();
  const items = trpc.material.getItemList.useQuery(undefined, materialQueryOptions);
  const categories = trpc.material.getCategoryList.useQuery(undefined, materialQueryOptions);
  const me = trpc.material.getMe.useQuery(undefined, materialQueryOptions);
  const isMaterialTeam = me.data?.isMaterialTeam ?? false;

  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<MaterialItemStatus | ''>('');
  const [sort, setSort] = useState<Sort>('name');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyReservable, setOnlyReservable] = useState(false);
  const [layout, setLayout] = useState<'list' | 'cards'>('list');
  const [reserving, setReserving] = useState<MaterialItem | undefined>();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (items.data ?? [])
      .filter(
        (item) =>
          (needle === '' ||
            item.name.toLowerCase().includes(needle) ||
            item.code.toLowerCase().includes(needle)) &&
          (categoryId === '' || item.category.id === categoryId) &&
          (status === '' || item.status === status) &&
          (!onlyAvailable || item.stock.available > 0) &&
          (!onlyReservable || (item.isReservable && !item.isDisabled)),
      )
      .toSorted(SORTS[sort]);
  }, [items.data, query, categoryId, status, onlyAvailable, onlyReservable, sort]);

  if (items.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!items.data) return <MaterialQueryError error={items.error} />;

  const all = items.data;
  const total = all.reduce((sum, item) => sum + item.totalQuantity, 0);
  const available = all.reduce((sum, item) => sum + item.stock.available, 0);
  const issued = all.reduce((sum, item) => sum + item.stock.issued, 0);
  const reserved = all.reduce((sum, item) => sum + item.stock.reserved, 0);
  const damaged = all.reduce((sum, item) => sum + item.damagedQuantity + item.inRepairQuantity, 0);
  const inRepair = all.reduce((sum, item) => sum + item.inRepairQuantity, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={labels.total[locale]}
          value={total}
          hint={format(text.articles, locale, { n: all.length })}
        />
        <StatTile
          label={labels.available[locale]}
          value={available}
          hint={text.immediately[locale]}
          tone="green"
        />
        <StatTile
          label={labels.issued[locale]}
          value={issued}
          hint={format(text.reservedHint, locale, { n: reserved })}
          tone="orange"
        />
        <StatTile
          label={labels.damaged[locale]}
          value={damaged}
          hint={format(text.brokenHint, locale, { n: inRepair })}
          tone="red"
        />
      </div>

      <Panel>
        <div className="flex flex-col gap-2 border-b border-gray-100 p-3 2xl:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
            <input
              type="search"
              className={cn(inputClass, 'pl-9')}
              placeholder={text.search[locale]}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 2xl:flex">
            <NativeSelect
              aria-label={labels.category[locale]}
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">{text.allCategories[locale]}</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label={labels.status[locale]}
              value={status}
              onChange={(event) => setStatus(event.target.value as MaterialItemStatus | '')}
            >
              <option value="">{text.allStatus[locale]}</option>
              {Object.entries(itemStatusLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label[locale]}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label={text.sort[locale]}
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
            >
              {Object.entries(sortLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label[locale]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex h-11 self-start overflow-hidden rounded-lg border border-gray-300 lg:self-auto">
            {(
              [
                ['cards', LayoutGrid, text.cards[locale]],
                ['list', List, text.list[locale]],
              ] as const
            ).map(([value, Icon, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={layout === value}
                onClick={() => setLayout(value)}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 px-3 text-sm font-semibold',
                  layout === value ? 'bg-conveniat-green text-white' : 'bg-white text-gray-600',
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-gray-100 px-4 py-2 text-sm text-gray-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-[#47564c]"
              checked={onlyAvailable}
              onChange={(event) => setOnlyAvailable(event.target.checked)}
            />
            {text.onlyAvailable[locale]}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-[#47564c]"
              checked={onlyReservable}
              onChange={(event) => setOnlyReservable(event.target.checked)}
            />
            {text.onlyReservable[locale]}
          </label>
          <span className="ml-auto font-mono text-xs text-gray-500">
            {format(text.count, locale, { n: visible.length, total: all.length })}
          </span>
        </div>

        {visible.length === 0 && <EmptyState text={labels.empty[locale]} />}

        {layout === 'list' ? (
          <ul className="divide-y divide-gray-100">
            {visible.map((item) => (
              <li
                key={item.id}
                // a phone gets two lines, name and badge over bar and button; wider screens one
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex"
              >
                <Link
                  href={itemHref(item)}
                  className="flex min-w-0 items-center gap-3 sm:w-64 sm:flex-none"
                >
                  <MaterialItemImage
                    name={item.name}
                    imageUrl={item.imageUrl}
                    className="size-12"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-gray-900">{item.name}</div>
                    <div className="font-mono text-[11px] tracking-wider text-gray-500 uppercase">
                      {item.category.name}
                    </div>
                  </div>
                </Link>
                <div className="justify-self-end sm:order-3">
                  <ItemStatusBadge status={item.status} locale={locale} />
                </div>
                <div className="min-w-0 sm:order-2 sm:flex-1">
                  <MaterialStockBar
                    stock={item.stock}
                    totalQuantity={item.totalQuantity}
                    unavailable={item.damagedQuantity + item.inRepairQuantity}
                    unit={item.unit}
                    locale={locale}
                    maxPerLoan={item.maxLoanQuantity}
                  />
                </div>
                <div className="flex items-center gap-2 sm:order-4">
                  <Link
                    href={itemHref(item)}
                    aria-label={labels.details[locale]}
                    className="hidden size-11 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 sm:flex"
                  >
                    <ArrowUpRight className="size-4" aria-hidden />
                  </Link>
                  <ItemAction
                    item={item}
                    isMaterialTeam={isMaterialTeam}
                    locale={locale}
                    onReserve={setReserving}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => (
              <div key={item.id} className="flex flex-col rounded-xl border border-gray-200">
                <Link href={itemHref(item)}>
                  <MaterialItemImage
                    name={item.name}
                    imageUrl={item.imageUrl}
                    className="aspect-[4/3] w-full rounded-b-none text-4xl"
                  />
                </Link>
                <div className="flex flex-1 flex-col gap-3 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={itemHref(item)} className="min-w-0">
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="font-mono text-[11px] tracking-wider text-gray-500 uppercase">
                        {item.category.name}
                      </div>
                    </Link>
                    <ItemStatusBadge status={item.status} locale={locale} />
                  </div>
                  <MaterialStockBar
                    stock={item.stock}
                    totalQuantity={item.totalQuantity}
                    unavailable={item.damagedQuantity + item.inRepairQuantity}
                    unit={item.unit}
                    locale={locale}
                    maxPerLoan={item.maxLoanQuantity}
                  />
                  <div className="mt-auto flex justify-end">
                    <ItemAction
                      item={item}
                      isMaterialTeam={isMaterialTeam}
                      locale={locale}
                      onReserve={setReserving}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {reserving !== undefined && (
        <LoanRequestDialog
          item={reserving}
          open
          onOpenChange={(open) => {
            if (!open) setReserving(undefined);
          }}
          isMaterialTeam={isMaterialTeam}
        />
      )}
    </div>
  );
};
