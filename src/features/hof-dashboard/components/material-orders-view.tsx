'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  MaterialOrderForm,
  MaterialOrderItem,
} from '@/features/hof-dashboard/api/material-orders';
import type { MaterialExportSheet } from '@/features/hof-dashboard/api/material-orders-export';
import {
  LABEL_CLASS,
  Panel,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  SectionHeading,
} from '@/features/hof-dashboard/components/dashboard-ui';
import { MaterialOrderReview } from '@/features/hof-dashboard/components/material-order-review';
import { SortableHeader } from '@/features/hof-dashboard/components/sortable-header';
import { useMaterialExport } from '@/features/hof-dashboard/hooks/use-material-export';
import { sortRows, useTableSort } from '@/features/hof-dashboard/hooks/use-table-sort';
import {
  formatDate,
  formatDateTime,
  formatNumber,
  translate,
  type TextKey,
} from '@/features/hof-dashboard/texts';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronDown, Download, FileSpreadsheet } from 'lucide-react';
import type React from 'react';
import { useId, useRef, useState } from 'react';

type View = 'total' | 'perHof';

const SHEET_LABELS: Record<MaterialExportSheet, TextKey> = {
  total: 'viewTotal',
  perHof: 'viewPerHof',
  remarks: 'remarks',
  versions: 'sheetVersions',
};

/** A choice of a few, as the app's segmented control. */
const Segmented = <T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}): React.ReactNode => (
  <div role="group" aria-label={label} className={cn(segmentedTrackClassName, 'inline-flex')}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        aria-pressed={option.value === value}
        className={cn(segmentClassName(option.value === value), 'px-4 text-sm font-semibold')}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </button>
    ))}
  </div>
);

/** The materials by the form's sections, in its order. */
const bySection = (
  items: readonly MaterialOrderItem[],
): { section: string | undefined; items: MaterialOrderItem[] }[] => {
  const sections: { section: string | undefined; items: MaterialOrderItem[] }[] = [];
  for (const item of items) {
    const last = sections.at(-1);
    if (last !== undefined && last.section === item.section) last.items.push(item);
    else sections.push({ section: item.section, items: [item] });
  }
  return sections;
};

/** The Höfe that ordered a material and how much, the largest first. */
const ordersOf = (
  form: MaterialOrderForm,
  itemId: string,
): { hofId: string; hofName: string; quantity: number }[] =>
  form.hoefe
    .map((hof) => ({
      hofId: hof.hofId,
      hofName: hof.hofName,
      quantity: hof.quantities[itemId] ?? 0,
    }))
    .filter((order) => order.quantity > 0)
    .toSorted((a, b) => b.quantity - a.quantity);

/** Every Hof's quantity of one material as bars, so an outlier stands out. */
const HofBars: React.FC<{
  orders: { hofId: string; hofName: string; quantity: number }[];
  onOpen: (hofId: string) => void;
  locale: Locale;
}> = ({ orders, onOpen, locale }) => {
  const largest = orders[0]?.quantity ?? 0;
  return (
    <ul className="space-y-1.5">
      {orders.map((order) => (
        <li
          key={order.hofId}
          className="grid grid-cols-[minmax(8rem,16rem)_minmax(0,1fr)_4rem] items-center gap-3"
        >
          <button
            type="button"
            className="min-h-9 cursor-pointer truncate text-left text-sm text-green-900 hover:underline"
            aria-label={translate('openOrder', locale, { hof: order.hofName })}
            onClick={() => onOpen(order.hofId)}
          >
            {order.hofName}
          </button>
          <span aria-hidden className="bg-quiet h-2.5 overflow-hidden rounded-full">
            <span
              className="bg-conveniat-green block h-full rounded-full"
              style={{ width: `${(order.quantity / largest) * 100}%` }}
            />
          </span>
          <span className="text-right text-sm font-semibold text-green-900 tabular-nums">
            {formatNumber(order.quantity, locale)}
          </span>
        </li>
      ))}
    </ul>
  );
};

/** The line under a sticky header, so rows scrolling under it stay apart from it. */
const STICKY_HEAD = 'sticky z-20 bg-page shadow-[0_1px_0] shadow-line';

/** The line beside a sticky first column, for rows scrolled sideways under it. */
const STICKY_COLUMN = 'sticky left-0 z-10 shadow-[1px_0_0] shadow-line';

type TotalColumn = 'material' | 'total' | 'hoefe' | 'largest';

/** One material with what the Höfe ordered of it. */
interface MaterialTotal {
  item: MaterialOrderItem;
  orders: { hofId: string; hofName: string; quantity: number }[];
  total: number;
}

const totalValue = (row: MaterialTotal, column: TotalColumn): number | string => {
  if (column === 'material') return row.item.name;
  if (column === 'total') return row.total;
  if (column === 'hoefe') return row.orders.length;
  return row.orders[0]?.quantity ?? 0;
};

/**
 * How much of each material the Ressort has to get, and from whom how much. In the form's order
 * by its sections, or sorted by any column, then as one list.
 */
const TotalTable: React.FC<{
  form: MaterialOrderForm;
  onOpen: (hofId: string) => void;
  locale: Locale;
}> = ({ form, onOpen, locale }) => {
  const [expanded, setExpanded] = useState<string>();
  const { sort, toggle } = useTableSort<TotalColumn>();
  const totals = (items: readonly MaterialOrderItem[]): MaterialTotal[] =>
    items.map((item) => {
      const orders = ordersOf(form, item.id);
      return { item, orders, total: orders.reduce((sum, order) => sum + order.quantity, 0) };
    });
  // sorted, the sections would split what is compared, so the list is one
  const groups =
    sort === undefined
      ? bySection(form.items).map(({ section, items }) => ({ section, rows: totals(items) }))
      : [{ section: undefined, rows: sortRows(totals(form.items), sort, totalValue, locale) }];
  const head = (column: TotalColumn, label: TextKey, className?: string): React.ReactNode => (
    <SortableHeader
      sortKey={column}
      sort={sort}
      onSort={toggle}
      align={column === 'material' ? 'left' : 'right'}
      className={className}
    >
      {translate(label, locale)}
    </SortableHeader>
  );

  return (
    <table className="w-full text-base">
      {/* stays under the site's header while the list scrolls */}
      <thead className={cn(STICKY_HEAD, 'top-(--app-header-height)')}>
        <tr className={LABEL_CLASS}>
          {head('material', 'material', 'rounded-tl-[14px] pl-2 @xl:pl-3')}
          {head('total', 'xlsxTotal')}
          {head('hoefe', 'xlsxHoefe')}
          {head('largest', 'largestOrder', 'rounded-tr-[14px] pr-2 @xl:pr-3')}
        </tr>
      </thead>
      {groups.map(({ section, rows }, index) => (
        <tbody key={section ?? `section-${index}`} className="divide-line divide-y">
          {section !== undefined && (
            <tr>
              <th
                scope="colgroup"
                colSpan={4}
                className={cn(
                  LABEL_CLASS,
                  'border-line border-t px-5 pt-5 pb-2 text-left @xl:px-6',
                )}
              >
                {section}
              </th>
            </tr>
          )}
          {rows.map(({ item, orders, total }) => {
            const open = expanded === item.id;
            return [
              <tr key={item.id} className={cn(open && 'bg-gray-50')}>
                <th scope="row" className="px-5 py-1 text-left font-normal @xl:px-6">
                  {orders.length === 0 ? (
                    <span className="flex min-h-11 items-center text-green-700">{item.name}</span>
                  ) : (
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-label={translate('showHoefeOf', locale, { material: item.name })}
                      className="flex min-h-11 w-full cursor-pointer items-center gap-2 text-left text-green-900"
                      onClick={() => setExpanded(open ? undefined : item.id)}
                    >
                      <ChevronDown
                        aria-hidden
                        className={cn(
                          'h-4 w-4 shrink-0 text-green-500 transition',
                          open && 'rotate-180',
                        )}
                      />
                      {item.name}
                    </button>
                  )}
                </th>
                <td
                  className={cn(
                    'px-3 text-right font-semibold tabular-nums',
                    total === 0 ? 'text-gray-400' : 'text-green-900',
                  )}
                >
                  {formatNumber(total, locale)}
                </td>
                <td className="px-3 text-right text-green-800 tabular-nums">{orders.length}</td>
                <td className="px-5 text-right text-green-800 tabular-nums @xl:px-6">
                  {orders[0] === undefined ? '–' : formatNumber(orders[0].quantity, locale)}
                </td>
              </tr>,
              open && (
                <tr key={`${item.id}-bars`} className="bg-gray-50">
                  <td colSpan={4} className="px-5 pt-1 pb-4 @xl:px-6">
                    <HofBars orders={orders} onOpen={onOpen} locale={locale} />
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
      ))}
    </table>
  );
};

/** The Hof's name, or one material's quantity, to sort the Höfe by. */
type PerHofColumn = 'hof' | `item:${string}`;

/**
 * What each Hof gets at the handout: one row per Hof, one column per material, sortable by the
 * Hof or by any material. Scrolls in a box of its own, both ways, with the materials on top and
 * the Höfe on the left staying in place.
 */
const PerHofTable: React.FC<{
  form: MaterialOrderForm;
  onOpen: (hofId: string) => void;
  locale: Locale;
}> = ({ form, onOpen, locale }) => {
  const { sort, toggle } = useTableSort<PerHofColumn>();
  const sections = bySection(form.items);
  const hasSections = sections.some(({ section }) => section !== undefined);
  const hoefe = sortRows(
    form.hoefe,
    sort,
    (hof, column) => (column === 'hof' ? hof.hofName : (hof.quantities[column.slice(5)] ?? 0)),
    locale,
  );
  return (
    // as tall as the window under the site's header, so its own header can stay in place
    <div className="max-h-[calc(100dvh-var(--app-header-height)-2rem)] overflow-auto overscroll-x-contain">
      <table className="w-max min-w-full text-sm">
        <thead className={cn(STICKY_HEAD, 'top-0')}>
          {hasSections && (
            <tr className={LABEL_CLASS}>
              <th scope="col" className={cn(STICKY_COLUMN, 'bg-page')} />
              {sections.map(({ section, items }, index) => (
                <th
                  key={section ?? `section-${index}`}
                  scope="colgroup"
                  colSpan={items.length}
                  className="border-line border-l px-3 pt-3 text-left font-bold"
                >
                  {section}
                </th>
              ))}
            </tr>
          )}
          <tr>
            <SortableHeader
              sortKey="hof"
              sort={sort}
              onSort={toggle}
              className={cn(STICKY_COLUMN, 'bg-page pl-2', LABEL_CLASS)}
            >
              {translate('hof', locale)}
            </SortableHeader>
            {form.items.map((item) => (
              <SortableHeader
                key={item.id}
                sortKey={`item:${item.id}`}
                sort={sort}
                onSort={toggle}
                align="right"
                className="max-w-32 min-w-20 text-xs font-semibold [overflow-wrap:anywhere] hyphens-auto text-green-800"
              >
                {item.name}
              </SortableHeader>
            ))}
          </tr>
        </thead>
        <tbody className="divide-line divide-y">
          {hoefe.map((hof) => (
            <tr key={hof.hofId} className="group">
              <th
                scope="row"
                className={cn(
                  STICKY_COLUMN,
                  'bg-white px-5 py-1 text-left font-normal group-hover:bg-gray-50',
                )}
              >
                <button
                  type="button"
                  className="flex min-h-11 max-w-60 cursor-pointer items-center gap-2 text-left text-green-900 hover:underline"
                  aria-label={translate('openOrder', locale, { hof: hof.hofName })}
                  onClick={() => onOpen(hof.hofId)}
                >
                  {hof.hofName}
                  {hof.orderedAt === undefined && (
                    <span className="text-xs text-green-600">
                      ({translate('legendMissing', locale)})
                    </span>
                  )}
                </button>
              </th>
              {form.items.map((item) => {
                const quantity = hof.quantities[item.id] ?? 0;
                return (
                  <td
                    key={item.id}
                    className={cn(
                      'px-3 text-right tabular-nums group-hover:bg-gray-50',
                      quantity === 0 ? 'text-gray-300' : 'text-green-900',
                    )}
                  >
                    {quantity === 0 ? '–' : formatNumber(quantity, locale)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {/* the totals stay at the foot, whatever the sort, and in sight while the Höfe scroll */}
        <tfoot className="shadow-line sticky bottom-0 z-20 bg-white shadow-[0_-1px_0]">
          <tr className="font-semibold">
            <th
              scope="row"
              className={cn(STICKY_COLUMN, 'bg-white px-5 py-3 text-left text-green-900')}
            >
              {translate('xlsxTotal', locale)}
            </th>
            {form.items.map((item) => (
              <td key={item.id} className="px-3 py-3 text-right text-green-900 tabular-nums">
                {formatNumber(
                  form.hoefe.reduce((sum, hof) => sum + (hof.quantities[item.id] ?? 0), 0),
                  locale,
                )}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

/**
 * What the export holds, both forms or the one shown, and which sheets: a popup under its button
 * on a desktop, a sheet from the bottom on a phone.
 */
const ExportSheet: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The button that opens it, which a desktop shows it under. */
  anchor: React.RefObject<HTMLButtonElement | null>;
  forms: readonly MaterialOrderForm[];
  current: MaterialOrderForm;
  locale: Locale;
}> = ({ open, onOpenChange, anchor, forms, current, locale }) => {
  const { download, pending } = useMaterialExport(locale);
  const [onlyCurrent, setOnlyCurrent] = useState(false);
  const [sheets, setSheets] = useState<Set<MaterialExportSheet>>(
    () => new Set(['total', 'perHof', 'remarks']),
  );
  const formsLabelId = useId();
  const sheetsLabelId = useId();
  const toggle = (sheet: MaterialExportSheet): void =>
    setSheets((chosen) => {
      const next = new Set(chosen);
      if (next.has(sheet)) next.delete(sheet);
      else next.add(sheet);
      return next;
    });

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      anchor={anchor}
      title={translate('excelExport', locale)}
      footer={
        <div className="space-y-2">
          <button
            type="button"
            className={cn(PRIMARY_BUTTON_CLASS, 'w-full')}
            disabled={pending || sheets.size === 0}
            onClick={() =>
              void download(onlyCurrent ? [current.id] : forms.map((form) => form.id), [
                ...sheets,
              ]).then(() => onOpenChange(false))
            }
          >
            <Download aria-hidden />
            {translate(pending ? 'exporting' : 'download', locale)}
          </button>
          <p className="text-sm text-pretty text-green-700">
            {translate(sheets.size === 0 ? 'exportNoSheet' : 'exportHint', locale)}
          </p>
        </div>
      }
    >
      {/* side by side in a desktop's popup, one under the other on a phone */}
      <div className="grid gap-5 sm:grid-cols-2">
        {forms.length > 1 && (
          <fieldset aria-labelledby={formsLabelId} className="space-y-2">
            <legend id={formsLabelId} className="text-sm font-semibold text-green-900">
              {translate('exportForms', locale)}
            </legend>
            {[false, true].map((only) => (
              <label key={String(only)} className="flex min-h-11 items-center gap-3 text-base">
                <input
                  type="radio"
                  name={formsLabelId}
                  checked={onlyCurrent === only}
                  onChange={() => setOnlyCurrent(only)}
                  className="accent-conveniat-green h-4 w-4 shrink-0"
                />
                {only
                  ? translate('exportCurrentForm', locale, { form: current.title })
                  : translate('exportAllForms', locale)}
              </label>
            ))}
          </fieldset>
        )}
        <fieldset aria-labelledby={sheetsLabelId} className="space-y-2">
          <legend id={sheetsLabelId} className="text-sm font-semibold text-green-900">
            {translate('exportSheets', locale)}
          </legend>
          {(Object.keys(SHEET_LABELS) as MaterialExportSheet[]).map((sheet) => (
            <label key={sheet} className="flex min-h-11 items-center gap-3 text-base">
              <input
                type="checkbox"
                checked={sheets.has(sheet)}
                onChange={() => toggle(sheet)}
                className="accent-conveniat-green h-4 w-4 shrink-0"
              />
              {translate(SHEET_LABELS[sheet], locale)}
            </label>
          ))}
        </fieldset>
      </div>
    </BottomSheet>
  );
};

/** A Hof's name that opens its order. */
const HofLink: React.FC<{ name: string; onOpen: () => void; locale: Locale }> = ({
  name,
  onOpen,
  locale,
}) => (
  <button
    type="button"
    className="cursor-pointer text-left font-semibold text-green-900 underline-offset-2 hover:underline"
    aria-label={translate('openOrder', locale, { hof: name })}
    onClick={onOpen}
  >
    {name}
  </button>
);

/** Who ordered and who did not, what changed since the export, and the Höfe's remarks. */
const SidePanels: React.FC<{
  form: MaterialOrderForm;
  onOpen: (hofId: string) => void;
  className?: string;
  locale: Locale;
}> = ({ form, onOpen, className, locale }) => {
  const ordered = form.hoefe.filter((hof) => hof.orderedAt !== undefined);
  const missing = form.hoefe.filter((hof) => hof.orderedAt === undefined);
  const changed = ordered
    .filter((hof) => hof.changedSinceExport)
    .toSorted((a, b) => (b.orderedAt ?? '').localeCompare(a.orderedAt ?? ''));
  const remarks = form.hoefe.flatMap((hof) => {
    const counted = form.mode === 'entries' ? hof.versions : hof.versions.slice(0, 1);
    const all = counted.flatMap((version) => version.remarks);
    return all.length === 0 ? [] : [{ hof, remarks: all }];
  });

  return (
    <div className={cn('space-y-6', className)}>
      <Panel className="space-y-3">
        <SectionHeading className="text-xl">{translate('orderedState', locale)}</SectionHeading>
        <p className="text-base text-green-800">
          {translate('orderedCount', locale, { n: ordered.length, total: form.hoefe.length })}
        </p>
        {missing.length === 0 ? (
          <p className="text-sm text-green-700">{translate('allOrdered', locale)}</p>
        ) : (
          <details className="group text-sm">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold text-green-900">
              <ChevronDown aria-hidden className="h-4 w-4 transition group-open:rotate-180" />
              {translate('notOrderedCount', locale, { n: missing.length })}
            </summary>
            <ul className="space-y-1 pl-6 text-green-800">
              {missing.map((hof) => (
                <li key={hof.hofId}>{hof.hofName}</li>
              ))}
            </ul>
          </details>
        )}
      </Panel>

      <Panel className="space-y-3">
        <SectionHeading className="text-xl">
          {translate('changedSinceExport', locale)}
        </SectionHeading>
        <p className="text-sm text-green-700">
          {form.exportedAt === undefined
            ? translate('neverExported', locale)
            : translate('lastExportOn', locale, {
                date: formatDateTime(form.exportedAt, locale),
              })}
        </p>
        {form.exportedAt !== undefined &&
          (changed.length === 0 ? (
            <p className="text-base text-green-800">{translate('nothingChanged', locale)}</p>
          ) : (
            <ul className="divide-line divide-y text-base">
              {changed.map((hof) => (
                <li key={hof.hofId} className="flex items-baseline justify-between gap-3 py-2">
                  <HofLink name={hof.hofName} onOpen={() => onOpen(hof.hofId)} locale={locale} />
                  <span className="shrink-0 text-sm text-green-700 tabular-nums">
                    {formatDate(hof.orderedAt ?? '', locale)}
                  </span>
                </li>
              ))}
            </ul>
          ))}
      </Panel>

      <Panel className="space-y-3">
        <SectionHeading className="text-xl">{translate('remarks', locale)}</SectionHeading>
        {remarks.length === 0 ? (
          <p className="text-sm text-green-700">{translate('noRemarks', locale)}</p>
        ) : (
          <ul className="divide-line divide-y">
            {remarks.map(({ hof, remarks: ofHof }) => (
              <li key={hof.hofId} className="space-y-1 py-3 first:pt-0 last:pb-0">
                <HofLink name={hof.hofName} onOpen={() => onOpen(hof.hofId)} locale={locale} />
                {ofHof.map((remark, index) => (
                  <p key={index} className="text-sm whitespace-pre-line text-green-800">
                    <span className="text-green-600">{remark.label}: </span>
                    {remark.text}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
};

/**
 * The material orders of every Hof, for the Ressort: per form either how much of each material
 * is needed, with every Hof's share behind a row, or what each Hof gets, with who has not
 * ordered, what changed since the last export and the Höfe's remarks beside it, and the Excel
 * export. Only what counts is added up: the newest version of each Hof's order. A Hof opens its
 * order for review.
 */
export const MaterialOrdersView: React.FC<{
  onOpenHof: (hofId: string) => void;
  locale: Locale;
}> = ({ onOpenHof, locale }) => {
  const orders = trpc.hofDashboard.getMaterialOrderList.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    meta: { persist: false },
  });
  const [formId, setFormId] = useState<string>();
  const [view, setView] = useState<View>('total');
  const [exportOpen, setExportOpen] = useState(false);
  const exportButton = useRef<HTMLButtonElement>(null);
  const [reviewing, setReviewing] = useState<string>();

  if (orders.isLoading) {
    return (
      <div className="space-y-4" role="status">
        <span className="sr-only">{translate('loading', locale)}</span>
        <Skeleton className="h-11 w-80 bg-gray-200" />
        <Skeleton className="h-96 w-full rounded-xl bg-gray-200" />
      </div>
    );
  }
  if (orders.data === undefined) {
    return (
      <Panel className="space-y-4 text-base text-green-800">
        <p>{translate(globalThis.navigator.onLine ? 'loadError' : 'offline', locale)}</p>
        <button
          type="button"
          className={SECONDARY_BUTTON_CLASS}
          onClick={() => void orders.refetch()}
        >
          {translate('retry', locale)}
        </button>
      </Panel>
    );
  }
  const forms = orders.data;
  const form = forms.find((candidate) => candidate.id === formId) ?? forms[0];
  if (form === undefined) {
    return (
      <Panel>
        <p className="text-base text-green-700">{translate('noMaterialForms', locale)}</p>
      </Panel>
    );
  }

  const reviewed = form.hoefe.find((hof) => hof.hofId === reviewing);
  if (reviewed !== undefined) {
    return (
      <MaterialOrderReview
        form={form}
        hof={reviewed}
        onBack={() => setReviewing(undefined)}
        onOpenInDashboard={() => onOpenHof(reviewed.hofId)}
        locale={locale}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {forms.length > 1 && (
          <Segmented
            label={translate('orderForm', locale)}
            value={form.id}
            onChange={setFormId}
            options={forms.map((candidate) => ({ value: candidate.id, label: candidate.title }))}
          />
        )}
        <Segmented<View>
          label={translate('viewLabel', locale)}
          value={view}
          onChange={setView}
          options={[
            { value: 'total', label: translate('viewTotal', locale) },
            { value: 'perHof', label: translate('viewPerHof', locale) },
          ]}
        />
        <button
          type="button"
          ref={exportButton}
          aria-haspopup="dialog"
          aria-expanded={exportOpen}
          className={cn(SECONDARY_BUTTON_CLASS, '@3xl:ml-auto')}
          onClick={() => setExportOpen(true)}
        >
          <FileSpreadsheet aria-hidden />
          {translate('excelExport', locale)}
          <ChevronDown aria-hidden />
        </button>
      </div>

      <ExportSheet
        open={exportOpen}
        onOpenChange={setExportOpen}
        anchor={exportButton}
        forms={forms}
        current={form}
        locale={locale}
      />

      {/* what each Hof gets needs every column it can have, so the panels go under it */}
      <div
        className={cn(
          'grid items-start gap-6',
          view === 'total' && '@4xl:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]',
        )}
      >
        <Panel className="min-w-0 overflow-clip p-0 @xl:p-0">
          {view === 'total' ? (
            <TotalTable form={form} onOpen={setReviewing} locale={locale} />
          ) : (
            <PerHofTable form={form} onOpen={setReviewing} locale={locale} />
          )}
        </Panel>
        <SidePanels
          form={form}
          onOpen={setReviewing}
          locale={locale}
          className={cn(view === 'perHof' && 'grid items-start gap-6 space-y-0 @3xl:grid-cols-3')}
        />
      </div>
    </div>
  );
};
