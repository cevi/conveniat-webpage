'use client';

import {
  FilterChip,
  SearchField,
  Stepper,
  StickyAction,
} from '@/features/material/components/counter-ui';
import { itemListClass, ItemRow } from '@/features/material/components/item-row';
import { ItemHeader, ItemTexts } from '@/features/material/components/item-sections';
import { format, labels } from '@/features/material/components/material-labels';
import { ListPager } from '@/features/material/components/material-list-controls';
import { MaterialQueryError } from '@/features/material/components/material-query-error';
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
import { basketTotals, orderStepOf } from '@/features/material/utils/basket';
import { catalogItemPath, itemPath, parseScan } from '@/features/material/utils/scan';
import { trpc, type RouterOutputs } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
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
  basket: {
    de: '{lines} · {pieces} Stück',
    en: '{lines} · {pieces} pieces',
    fr: '{lines} · {pieces} pièces',
  },
  toRequest: { de: 'Weiter zur Anfrage', en: 'Go to the request', fr: 'Vers la demande' },
  toRequestShort: { de: 'Zur Anfrage', en: 'View request', fr: 'Voir la demande' },
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
  'id' | 'name' | 'isDisabled' | 'isReservable' | 'maxLoanQuantity' | 'orderStep' | 'stock'
>;

type SetQuantity = (item: RequestableItem, quantity: number) => void;

/**
 * What a participant can do with an article: ask for it, change how many while it is in the
 * request, or learn why not. In a list row it is a round "+" and a word of why not, so the
 * figures beside it keep their line; the article page, where it is the one thing to do, spells
 * it out.
 */
const RequestAction: React.FC<{
  item: RequestableItem;
  quantity: number;
  onChange: SetQuantity;
  wide?: boolean;
}> = ({ item, quantity, onChange, wide = false }) => {
  const locale = useMaterialLocale();
  const step = orderStepOf(item.orderStep);
  let unavailable: StaticTranslationString | undefined;
  if (item.isDisabled || item.stock.usable === 0) unavailable = text.noneFree;
  else if (!item.isReservable) unavailable = text.depotOnly;
  if (unavailable !== undefined) {
    return wide ? (
      <MaterialButton variant="secondary" disabled className="h-12 w-full text-base">
        {unavailable[locale]}
      </MaterialButton>
    ) : (
      <span className="block py-1 text-xs font-semibold text-gray-500">{unavailable[locale]}</span>
    );
  }
  if (quantity > 0) {
    return (
      <Stepper
        label={`${labels.quantity[locale]}: ${item.name}`}
        value={quantity}
        max={item.maxLoanQuantity}
        step={step}
        onChange={(next) => onChange(item, next)}
      />
    );
  }
  const add = (): void => onChange(item, Math.min(step, item.maxLoanQuantity));
  if (!wide) {
    return (
      <MaterialButton
        variant="secondary"
        className="w-11 rounded-full px-0"
        aria-label={`${text.request[locale]}: ${item.name}`}
        title={text.request[locale]}
        onClick={add}
      >
        <Plus aria-hidden />
      </MaterialButton>
    );
  }
  return (
    <MaterialButton className="h-12 w-full text-base" onClick={add}>
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
          (!onlyAvailable || item.stock.available > 0),
      )
      .toSorted(SORTS[sort]);
  }, [items, query, categoryId, onlyAvailable, sort]);
  const pagination = usePagination(
    visible.length,
    JSON.stringify([query.trim(), categoryId, onlyAvailable, sort]),
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
      <div ref={listTop} className="@container scroll-mt-20">
        <Panel>
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-1 pr-1 pl-4">
            <p className="text-sm text-gray-500 tabular-nums">
              {format(text.count, locale, { n: visible.length, total: items.length })}
            </p>
            <NativeSelect
              aria-label={text.sort[locale]}
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              // stays at the field's 16 px: anything smaller makes iOS zoom in on a tap
              className="w-auto border-transparent bg-transparent font-semibold text-gray-700"
            >
              {Object.entries(sortLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label[locale]}
                </option>
              ))}
            </NativeSelect>
          </div>
          {visible.length === 0 && <EmptyState text={labels.empty[locale]} />}
          <ul className={itemListClass}>
            {pageItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                href={catalogItemPath(item.code)}
                locale={locale}
                breakdown={false}
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

/** "1 Position · 10 Stück", what the request holds so far. */
const basketLabel = (lines: RequestLine[], locale: Locale): string => {
  const totals = basketTotals(lines);
  return format(text.basket, locale, {
    lines:
      totals.positions === 1
        ? labels.onePosition[locale]
        : format(labels.positions, locale, { n: totals.positions }),
    pieces: totals.pieces,
  });
};

/**
 * One article for a participant: what is free right under the name, the texts below, and
 * "request" held at the bottom of the screen, where it stays in reach while they read.
 */
const CatalogItemView: React.FC<{
  code: string;
  lines: RequestLine[];
  onChange: SetQuantity;
  onBack: () => void;
  onRequest: () => void;
}> = ({ code, lines, onChange, onBack, onRequest }) => {
  const locale = useMaterialLocale();
  const item = trpc.material.getCatalogItem.useQuery({ code }, materialQueryOptions);
  if (item.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!item.data) return <MaterialQueryError error={item.error} />;
  const data = item.data;
  const step = orderStepOf(data.orderStep);
  const quantity = lines.find((line) => line.itemId === data.id)?.quantity ?? 0;

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
      <ItemHeader item={data} locale={locale} hero>
        <MaterialStockBar
          stock={data.stock}
          totalQuantity={data.totalQuantity}
          unavailable={data.damagedQuantity + data.inRepairQuantity}
          unit={data.unit}
          locale={locale}
          size="lg"
          breakdown={false}
        />
        <p className="text-sm text-gray-500">
          {format(labels.maxPerRequest, locale, { n: data.maxLoanQuantity, unit: data.unit })}
          {step > 1 && ` · ${format(labels.inSteps, locale, { n: step })}`}
        </p>
      </ItemHeader>
      <ItemTexts item={data} locale={locale} />
      <StickyAction className="space-y-2">
        {/* the count and the way on side by side, as on the counter of a shop */}
        <div className="flex items-center gap-3">
          <div className={cn(quantity === 0 ? 'min-w-0 flex-1' : 'shrink-0')}>
            <RequestAction item={data} quantity={quantity} onChange={onChange} wide />
          </div>
          {lines.length > 0 && (
            <MaterialButton
              variant={quantity > 0 ? 'primary' : 'secondary'}
              className={cn('h-12', quantity > 0 && 'flex-1')}
              onClick={onRequest}
            >
              <Send aria-hidden />
              {text.toRequestShort[locale]}
            </MaterialButton>
          )}
        </div>
        {!data.isReservable && (
          <p className="text-center text-xs text-gray-500">{text.depotOnlyHint[locale]}</p>
        )}
        {lines.length > 0 && (
          <p className="text-center text-xs text-gray-500 tabular-nums">
            {basketLabel(lines, locale)}
          </p>
        )}
      </StickyAction>
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

  if (catalog.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!catalog.data) return <MaterialQueryError error={catalog.error} />;

  const itemCode = code !== null && code !== '' ? code : undefined;

  return (
    <div>
      {itemCode === undefined ? (
        <CatalogList
          items={catalog.data}
          quantityOf={quantityOf}
          onChange={setQuantity}
          onOpen={(next) => history.open(`item=${encodeURIComponent(next)}`)}
        />
      ) : (
        // brings its own bar at the bottom, with the article's button next to the request's
        <CatalogItemView
          key={itemCode}
          code={itemCode}
          lines={lines}
          onChange={setQuantity}
          onBack={history.close}
          onRequest={() => setRequesting(true)}
        />
      )}
      {itemCode === undefined && lines.length > 0 && (
        <StickyAction className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800 tabular-nums">
            {basketLabel(lines, locale)}
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
