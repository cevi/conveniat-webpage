'use client';

import {
  FilterChip,
  SearchField,
  Stepper,
  StickyAction,
} from '@/features/material/components/counter-ui';
import { ItemRow } from '@/features/material/components/item-row';
import { MaterialItemImage } from '@/features/material/components/material-item-image';
import { format, itemStatusLabel, labels } from '@/features/material/components/material-labels';
import { ListPager } from '@/features/material/components/material-list-controls';
import { MaterialQueryError } from '@/features/material/components/material-query-error';
import { ItemStatusBadge } from '@/features/material/components/material-status-badge';
import { MaterialStockBar } from '@/features/material/components/material-stock-bar';
import {
  EmptyState,
  focusRing,
  LoadingState,
  MaterialButton,
  NativeSelect,
  Panel,
} from '@/features/material/components/material-ui';
import { RequestSheet } from '@/features/material/components/request-sheet';
import { RoleGate } from '@/features/material/components/role-gate';
import { usePagination } from '@/features/material/hooks/use-list-state';
import { materialQueryOptions, useMaterialLocale } from '@/features/material/hooks/use-material';
import { useSearchHistory } from '@/features/material/hooks/use-search-history';
import { basketTotals } from '@/features/material/utils/basket';
import { catalogItemPath, itemPath, parseScan } from '@/features/material/utils/scan';
import type { MaterialItemStatus } from '@/features/material/utils/stock';
import { trpc, type RouterOutputs } from '@/trpc/client';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowLeft, Plus, Send } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import type React from 'react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type CatalogItem = RouterOutputs['material']['getCatalog'][number];

const text = {
  search: { de: 'Material suchen …', en: 'Search material …', fr: 'Chercher du matériel …' },
  filters: { de: 'Filter', en: 'Filters', fr: 'Filtres' },
  allStatus: { de: 'Alle Status', en: 'All statuses', fr: 'Tous les statuts' },
  onlyAvailable: { de: 'Nur verfügbare', en: 'Available only', fr: 'Disponibles' },
  sort: { de: 'Sortierung', en: 'Sort', fr: 'Tri' },
  sortName: { de: 'Name A–Z', en: 'Name A–Z', fr: 'Nom A–Z' },
  sortMostFree: { de: 'Meiste frei', en: 'Most free', fr: 'Plus de libres' },
  sortLeastFree: { de: 'Wenigste frei', en: 'Least free', fr: 'Moins de libres' },
  count: {
    de: '{n} von {total} Artikeln',
    en: '{n} of {total} items',
    fr: '{n} sur {total} articles',
  },
  request: { de: 'Anfragen', en: 'Request', fr: 'Demander' },
  noneFree: { de: 'Keine frei', en: 'None free', fr: 'Aucun libre' },
  depotOnly: { de: 'Nur im Depot', en: 'Depot only', fr: 'Au dépôt' },
  depotOnlyHint: {
    de: 'Dieser Artikel wird nur direkt im Materialdepot ausgegeben.',
    en: 'This item is only handed out at the material depot.',
    fr: 'Cet article est remis uniquement au dépôt de matériel.',
  },
  inRequest: { de: 'In der Anfrage', en: 'In the request', fr: 'Dans la demande' },
  basket: {
    de: '{lines} · {pieces} Stück',
    en: '{lines} · {pieces} pieces',
    fr: '{lines} · {pieces} pièces',
  },
  toRequest: { de: 'Weiter zur Anfrage', en: 'Go to the request', fr: 'Vers la demande' },
  back: { de: 'Zum Material', en: 'To the material', fr: 'Vers le matériel' },
  notAnItem: {
    de: 'Das ist kein Artikel-Etikett.',
    en: 'That is not an item label.',
    fr: 'Ce n’est pas une étiquette d’article.',
  },
} satisfies Record<string, StaticTranslationString>;

type Sort = 'name' | 'mostFree' | 'leastFree';

const SORTS: Record<Sort, (a: CatalogItem, b: CatalogItem) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  mostFree: (a, b) => b.stock.available - a.stock.available,
  leastFree: (a, b) => a.stock.available - b.stock.available,
};

const sortLabel: Record<Sort, StaticTranslationString> = {
  name: text.sortName,
  mostFree: text.sortMostFree,
  leastFree: text.sortLeastFree,
};

/** One article in a request, before it is sent. */
export interface RequestLine {
  itemId: string;
  quantity: number;
}

/** What the request button needs to know about an article. */
type RequestableItem = Pick<
  CatalogItem,
  'id' | 'name' | 'isDisabled' | 'isReservable' | 'maxLoanQuantity' | 'stock'
>;

type SetQuantity = (item: RequestableItem, quantity: number) => void;

/**
 * What a participant can do with an article: ask for it, change how many while it is in the
 * request, or learn why not.
 */
const RequestAction: React.FC<{
  item: RequestableItem;
  quantity: number;
  onChange: SetQuantity;
  wide?: boolean;
}> = ({ item, quantity, onChange, wide = false }) => {
  const locale = useMaterialLocale();
  if (item.isDisabled || item.stock.usable === 0) {
    return (
      <MaterialButton variant="secondary" disabled className={cn(wide && 'w-full')}>
        {text.noneFree[locale]}
      </MaterialButton>
    );
  }
  if (!item.isReservable) {
    return (
      <MaterialButton variant="secondary" disabled className={cn(wide && 'w-full')}>
        {text.depotOnly[locale]}
      </MaterialButton>
    );
  }
  if (quantity > 0) {
    return (
      <div className={cn('flex items-center gap-2', wide && 'w-full justify-between')}>
        <span className="text-xs font-semibold text-gray-600">{text.inRequest[locale]}</span>
        <Stepper
          label={`${labels.quantity[locale]}: ${item.name}`}
          value={quantity}
          max={item.maxLoanQuantity}
          onChange={(next) => onChange(item, next)}
        />
      </div>
    );
  }
  return (
    <MaterialButton
      variant="secondary"
      className={cn(wide && 'h-12 w-full text-base')}
      onClick={() => onChange(item, 1)}
    >
      <Plus aria-hidden />
      {text.request[locale]}
    </MaterialButton>
  );
};

/** Everything the depot has, with its numbers, found by name, shelf, status or scan. */
const CatalogList: React.FC<{
  items: CatalogItem[];
  quantityOf: (itemId: string) => number;
  onChange: SetQuantity;
  onOpen: (code: string) => void;
}> = ({ items, quantityOf, onChange, onOpen }) => {
  const locale = useMaterialLocale();
  const categories = trpc.material.getCategoryList.useQuery(undefined, materialQueryOptions);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<MaterialItemStatus | ''>('');
  const [sort, setSort] = useState<Sort>('name');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const listTop = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter(
        (item) =>
          (needle === '' ||
            item.name.toLowerCase().includes(needle) ||
            item.code.toLowerCase().includes(needle)) &&
          (categoryId === '' || item.category.id === categoryId) &&
          (status === '' || item.status === status) &&
          (!onlyAvailable || item.stock.available > 0),
      )
      .toSorted(SORTS[sort]);
  }, [items, query, categoryId, status, onlyAvailable, sort]);
  const pagination = usePagination(
    visible.length,
    JSON.stringify([query.trim(), categoryId, status, onlyAvailable, sort]),
  );
  const pageItems = visible.slice(pagination.slice.start, pagination.slice.end);

  return (
    <div className="space-y-3">
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder={text.search[locale]}
        onScan={(value) => {
          const scanned = parseScan(value, globalThis.location.origin);
          if (scanned?.kind !== 'item') {
            toast.error(text.notAnItem[locale]);
            return false;
          }
          onOpen(scanned.code);
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
        <FilterChip active={onlyAvailable} onClick={() => setOnlyAvailable(!onlyAvailable)}>
          {text.onlyAvailable[locale]}
        </FilterChip>
      </div>
      <div className="grid grid-cols-2 gap-2">
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
      <div ref={listTop} className="@container scroll-mt-20">
        <Panel>
          <p className="border-b border-gray-100 px-4 py-2 text-xs text-gray-500 tabular-nums">
            {format(text.count, locale, { n: visible.length, total: items.length })}
          </p>
          {visible.length === 0 && <EmptyState text={labels.empty[locale]} />}
          <ul className="divide-y divide-gray-100">
            {pageItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                href={catalogItemPath(item.code)}
                locale={locale}
                action={
                  <RequestAction item={item} quantity={quantityOf(item.id)} onChange={onChange} />
                }
              />
            ))}
          </ul>
          <ListPager
            pagination={pagination}
            onNavigate={() => listTop.current?.scrollIntoView({ block: 'start' })}
          />
        </Panel>
      </div>
    </div>
  );
};

/** One article for a participant: its numbers and texts, read only, and "request". */
const CatalogItemView: React.FC<{
  code: string;
  quantityOf: (itemId: string) => number;
  onChange: SetQuantity;
  onBack: () => void;
}> = ({ code, quantityOf, onChange, onBack }) => {
  const locale = useMaterialLocale();
  const item = trpc.material.getCatalogItem.useQuery({ code }, materialQueryOptions);
  if (item.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!item.data) return <MaterialQueryError error={item.error} />;
  const data = item.data;
  const numbers: [string, number, string][] = [
    [labels.available[locale], data.stock.available, 'text-green-700'],
    [labels.reserved[locale], data.stock.reserved, 'text-blue-700'],
    [labels.issued[locale], data.stock.issued, 'text-orange-600'],
    [labels.maxPerLoan[locale], data.maxLoanQuantity, 'text-gray-900'],
  ];

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className={cn(
          'inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-900',
          focusRing,
        )}
      >
        <ArrowLeft className="size-4" aria-hidden />
        {text.back[locale]}
      </button>
      <div className="flex items-start gap-4">
        <MaterialItemImage
          name={data.name}
          imageUrl={data.imageUrl}
          className="size-24 rounded-2xl text-3xl sm:size-32"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-xs tracking-wider text-gray-500 uppercase">
            {data.category.name} · {data.code}
          </div>
          <h1 className="text-conveniat-green mt-1 text-xl font-bold break-words sm:text-2xl">
            {data.name}
          </h1>
          <div className="mt-2">
            <ItemStatusBadge status={data.status} locale={locale} />
          </div>
        </div>
      </div>
      <Panel>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-t-2xl bg-gray-100 sm:grid-cols-4">
          {numbers.map(([label, value, tone]) => (
            <div key={label} className="min-w-0 bg-white px-4 py-3">
              <dt className="truncate text-xs text-gray-500">{label}</dt>
              <dd className={cn('text-xl font-bold tabular-nums', tone)}>
                {value} {data.unit}
              </dd>
            </div>
          ))}
        </dl>
        <div className="p-4">
          <MaterialStockBar
            stock={data.stock}
            totalQuantity={data.totalQuantity}
            unavailable={data.damagedQuantity + data.inRepairQuantity}
            unit={data.unit}
            locale={locale}
            size="lg"
          />
        </div>
      </Panel>
      <RequestAction item={data} quantity={quantityOf(data.id)} onChange={onChange} wide />
      {!data.isReservable && (
        <p className="text-center text-xs text-gray-500">{text.depotOnlyHint[locale]}</p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={labels.description[locale]}>
          <div className="space-y-3 p-4 text-sm text-gray-700">
            <p className="whitespace-pre-line">{data.description}</p>
            {data.usageNotes !== null && data.usageNotes !== '' && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                <span className="font-semibold">{labels.usageNotes[locale]}: </span>
                {data.usageNotes}
              </p>
            )}
          </div>
        </Panel>
        <Panel title={labels.returnInstructions[locale]}>
          <p className="p-4 text-sm whitespace-pre-line text-gray-700">{data.returnInstructions}</p>
        </Panel>
      </div>
    </div>
  );
};

/**
 * The catalogue and the request basket of everybody who is not in the material team. The
 * basket lives here, above the list and the article pages, so it survives going back and
 * forth; the bar at the bottom leads to the request form.
 */
const CatalogScreen: React.FC = () => {
  const locale = useMaterialLocale();
  const code = useSearchParams().get('item');
  const history = useSearchHistory();
  const catalog = trpc.material.getCatalog.useQuery(undefined, materialQueryOptions);
  const [lines, setLines] = useState<RequestLine[]>([]);
  const [requesting, setRequesting] = useState(false);

  const quantityOf = (itemId: string): number =>
    lines.find((line) => line.itemId === itemId)?.quantity ?? 0;
  const setQuantity: SetQuantity = (item, quantity) =>
    setLines((current) => {
      const others = current.filter((line) => line.itemId !== item.id);
      return quantity <= 0 ? others : [...others, { itemId: item.id, quantity }];
    });
  const totals = basketTotals(lines);

  if (catalog.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!catalog.data) return <MaterialQueryError error={catalog.error} />;

  return (
    <div>
      {code !== null && code !== '' ? (
        <CatalogItemView
          key={code}
          code={code}
          quantityOf={quantityOf}
          onChange={setQuantity}
          onBack={history.close}
        />
      ) : (
        <CatalogList
          items={catalog.data}
          quantityOf={quantityOf}
          onChange={setQuantity}
          onOpen={(next) => history.open(`item=${encodeURIComponent(next)}`)}
        />
      )}
      {totals.positions > 0 && (
        <StickyAction className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">
            {format(text.basket, locale, {
              lines:
                totals.positions === 1
                  ? labels.onePosition[locale]
                  : format(labels.positions, locale, { n: totals.positions }),
              pieces: totals.pieces,
            })}
          </span>
          <MaterialButton className="h-12" onClick={() => setRequesting(true)}>
            <Send aria-hidden />
            {text.toRequest[locale]}
          </MaterialButton>
        </StickyAction>
      )}
      {requesting && (
        <RequestSheet
          lines={lines}
          items={catalog.data}
          onLinesChange={setLines}
          onClose={() => setRequesting(false)}
        />
      )}
    </div>
  );
};

/** The catalogue belongs to participants; the material team works with the inventory. */
export const CatalogPage: React.FC = () => {
  const code = useSearchParams().get('item');
  return (
    <RoleGate
      role="participant"
      elsewhere={code === null || code === '' ? '/app/material/inventar' : itemPath(code)}
    >
      <CatalogScreen />
    </RoleGate>
  );
};
