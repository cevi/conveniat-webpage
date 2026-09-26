'use client';

import { LoanBulkBar } from '@/features/material/components/loan-bulk-bar';
import {
  LoanCard,
  loanHofName,
  loanHolderName,
  loanQuantity,
} from '@/features/material/components/loan-card';
import {
  LoanDetailDialog,
  type LoanDialogMode,
} from '@/features/material/components/loan-detail-dialog';
import {
  LoanActionMenu,
  LoanPrimaryAction,
  splitLoanActions,
} from '@/features/material/components/loan-row-actions';
import {
  format,
  formatDay,
  labels,
  loanStatusLabel,
} from '@/features/material/components/material-labels';
import {
  FilterBar,
  ListPager,
  SelectCheckbox,
  SortHeader,
  sortProperties,
  type FilterChip,
} from '@/features/material/components/material-list-controls';
import { MaterialQueryError } from '@/features/material/components/material-query-error';
import { LoanStatusBadge } from '@/features/material/components/material-status-badge';
import {
  DateInput,
  EmptyState,
  Field,
  focusRing,
  LoadingState,
  MaterialButton,
  NativeSelect,
  Panel,
} from '@/features/material/components/material-ui';
import { usePagination, useSelection } from '@/features/material/hooks/use-list-state';
import {
  MATERIAL_POLL_INTERVAL_MS,
  materialQueryOptions,
  useMaterialLocale,
  useNow,
  type MaterialLoan,
} from '@/features/material/hooks/use-material';
import { fromDateInput } from '@/features/material/utils/dates';
import {
  nextSort,
  selectionState,
  sortRows,
  type BulkResult,
  type SortState,
} from '@/features/material/utils/list-view';
import { compareReturnQueue, isInReturnQueue } from '@/features/material/utils/returns';
import {
  getLoanDisplayStatus,
  type MaterialLoanDisplayStatus,
} from '@/features/material/utils/stock';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CornerDownLeft, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import type React from 'react';
import { useMemo, useRef, useState } from 'react';

export type LoanListMode = 'loans' | 'reservations' | 'returns';

const text = {
  search: {
    de: 'Artikel, Person, Nummer …',
    en: 'Item, person, number …',
    fr: 'Article, personne, numéro …',
  },
  allHoefe: { de: 'Alle Höfe', en: 'All Hofs', fr: 'Tous les Hofs' },
  allStatus: { de: 'Alle Status', en: 'All statuses', fr: 'Tous les statuts' },
  count: { de: '{n} Einträge', en: '{n} entries', fr: '{n} entrées' },
  showClosed: {
    de: 'Abgeschlossene anzeigen',
    en: 'Show closed',
    fr: 'Afficher les terminés',
  },
  closedChip: { de: 'mit abgeschlossenen', en: 'incl. closed', fr: 'avec terminés' },
} satisfies Record<string, StaticTranslationString>;

/** Which statuses the loans and reservations tabs list before any filter is applied. */
const MODE_STATUSES: Record<Exclude<LoanListMode, 'returns'>, MaterialLoanDisplayStatus[]> = {
  loans: ['ISSUED', 'RETURN_DUE', 'OVERDUE'],
  reservations: ['REQUESTED', 'RESERVED'],
};

const CLOSED = new Set<MaterialLoanDisplayStatus>(['RETURNED', 'CONSUMED', 'CANCELLED']);

/** Most urgent first when a list is sorted by status. */
const STATUS_RANK: Record<MaterialLoanDisplayStatus, number> = {
  OVERDUE: 0,
  RETURN_DUE: 1,
  ISSUED: 2,
  REQUESTED: 3,
  RESERVED: 4,
  RETURNED: 5,
  CONSUMED: 6,
  CANCELLED: 7,
};

type SortKey = 'item' | 'quantity' | 'hof' | 'start' | 'end' | 'status';

const sortKeyLabel: Record<SortKey, StaticTranslationString> = {
  item: labels.article,
  quantity: labels.quantity,
  hof: labels.hof,
  start: labels.startDate,
  end: labels.endDate,
  status: labels.status,
};

/** Column headers, short where a date column would otherwise be as wide as its header. */
const columnLabel: Record<SortKey, StaticTranslationString> = {
  ...sortKeyLabel,
  start: labels.startDateShort,
  end: labels.endDateShort,
};

/** The sorts a phone offers in its filter sheet, where there are no column headers. */
const SHEET_SORTS: SortState<SortKey>[] = [
  { key: 'item', direction: 'ascending' },
  { key: 'item', direction: 'descending' },
  { key: 'end', direction: 'ascending' },
  { key: 'end', direction: 'descending' },
  { key: 'start', direction: 'ascending' },
  { key: 'status', direction: 'ascending' },
];

const sortValue = (sort: SortState<SortKey>): string =>
  sort === undefined ? '' : `${sort.key}:${sort.direction}`;

/**
 * The table's column that goes when the list gets narrow: the start of a loan matters less
 * than its return, except on the reservations tab, which is worked through by start.
 */
const primaryDate = (mode: LoanListMode): 'start' | 'end' =>
  mode === 'reservations' ? 'start' : 'end';

/** Whether a loan belongs on a tab: the returns tab is what should come back now. */
const isInMode = (
  mode: LoanListMode,
  loan: MaterialLoan,
  displayStatus: MaterialLoanDisplayStatus,
  now: Date,
): boolean =>
  mode === 'returns' ? isInReturnQueue(loan, now) : MODE_STATUSES[mode].includes(displayStatus);

/** Returns in the order the counter works through them; everything else newest first. */
const sortFor = (mode: LoanListMode, now: Date): ((a: MaterialLoan, b: MaterialLoan) => number) => {
  if (mode === 'returns') return compareReturnQueue(now);
  if (mode === 'reservations') return (a, b) => a.startDate.getTime() - b.startDate.getTime();
  return (a, b) => b.startDate.getTime() - a.startDate.getTime();
};

const comparatorsFor = (
  now: Date,
  locale: Locale,
): Record<SortKey, (a: MaterialLoan, b: MaterialLoan) => number> => ({
  item: (a, b) => a.item.name.localeCompare(b.item.name, locale),
  quantity: (a, b) => loanQuantity(a) - loanQuantity(b),
  // a loan cached before the Höfe has no `hof`
  hof: (a, b) => (a.hof?.name ?? '').localeCompare(b.hof?.name ?? '', locale),
  start: (a, b) => a.startDate.getTime() - b.startDate.getTime(),
  end: (a, b) => a.endDate.getTime() - b.endDate.getTime(),
  status: (a, b) =>
    STATUS_RANK[getLoanDisplayStatus(a, now)] - STATUS_RANK[getLoanDisplayStatus(b, now)],
});

const matchesSearch = (loan: MaterialLoan, needle: string): boolean =>
  needle === '' ||
  [
    loan.item.name,
    loan.item.code,
    loan.responsibleName,
    loan.person?.name ?? '',
    loan.hof?.name ?? '',
    `#${loan.number}`,
  ].some((value) => value.toLowerCase().includes(needle));

/** Opens or closes a loan through `?loan=`, without a server round trip, so it works offline. */
const setLoanParameter = (loanNumber: number | undefined): void => {
  const url = new URL(globalThis.location.href);
  if (loanNumber === undefined) url.searchParams.delete('loan');
  else url.searchParams.set('loan', String(loanNumber));
  globalThis.history.replaceState(undefined, '', url.toString());
};

const th = 'px-2 text-xs font-semibold tracking-wide text-gray-500 uppercase';

export const LoanListView: React.FC<{ mode: LoanListMode }> = ({ mode }) => {
  const locale = useMaterialLocale();
  const now = useNow();
  const searchParameters = useSearchParams();
  const [hofId, setHofId] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<MaterialLoanDisplayStatus | ''>('');
  const [date, setDate] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const [sort, setSort] = useState<SortState<SortKey>>();
  const [openMode, setOpenMode] = useState<LoanDialogMode>('view');
  const [selecting, setSelecting] = useState(false);
  const selection = useSelection();
  const listTop = useRef<HTMLElement>(null);

  // closed loans only when asked for; the open ones then all fit under the server's cap
  const openOnly = !showClosed && (status === '' || !CLOSED.has(status));
  const loans = trpc.material.getLoanList.useQuery(
    { openOnly },
    { ...materialQueryOptions, refetchInterval: MATERIAL_POLL_INTERVAL_MS },
  );
  const me = trpc.material.getMe.useQuery(undefined, materialQueryOptions);
  const hoefe = trpc.material.getHofList.useQuery(undefined, materialQueryOptions);
  const isMaterialTeam = me.data?.isMaterialTeam ?? false;

  // a scanned loan label lands here with `?loan=<number>`, and may be missing from the list
  const loanParameter = searchParameters.get('loan');
  const openNumber = loanParameter === null ? Number.NaN : Number(loanParameter);
  const hasOpenNumber = Number.isInteger(openNumber) && openNumber > 0;
  const linkedLoan = trpc.material.getLoan.useQuery(
    { number: hasOpenNumber ? openNumber : 0 },
    { ...materialQueryOptions, enabled: hasOpenNumber },
  );
  const openLoan = hasOpenNumber
    ? (linkedLoan.data ?? loans.data?.find((loan) => loan.number === openNumber))
    : undefined;
  const linkedLoanMissing = hasOpenNumber && openLoan === undefined && linkedLoan.isError;

  const openLoanIn = (loan: MaterialLoan, dialogMode: LoanDialogMode): void => {
    setOpenMode(dialogMode);
    setLoanParameter(loan.number);
  };
  const closeLoan = (): void => {
    setOpenMode('view');
    setLoanParameter(undefined);
  };

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const day = fromDateInput(date, 'start');
    const dayEnd = fromDateInput(date, 'end');

    const filtered = (loans.data ?? [])
      .filter((loan) => {
        const displayStatus = getLoanDisplayStatus(loan, now);
        if (status === '') {
          const shownClosed = showClosed && CLOSED.has(displayStatus);
          if (!shownClosed && !isInMode(mode, loan, displayStatus, now)) return false;
        } else if (displayStatus !== status) {
          return false;
        }
        if (hofId !== '' && loan.hofId !== hofId) return false;
        if (!matchesSearch(loan, needle)) return false;
        if (
          day !== undefined &&
          dayEnd !== undefined &&
          (loan.startDate > dayEnd || loan.endDate < day)
        ) {
          return false;
        }
        return true;
      })
      .toSorted(sortFor(mode, now));
    return sortRows(filtered, sort, comparatorsFor(now, locale));
  }, [loans.data, mode, status, hofId, search, date, showClosed, sort, now, locale]);

  const pagination = usePagination(
    rows.length,
    JSON.stringify([mode, status, hofId, search.trim(), date, showClosed, sort]),
  );

  if (loans.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!loans.data) return <MaterialQueryError error={loans.error} />;

  const { slice } = pagination;
  const pageRows = rows.slice(slice.start, slice.end);
  const pageIds = pageRows.map((loan) => loan.id);
  // what the filters hide is not acted on, so it does not count as selected either
  const selectedLoans = rows.filter((loan) => selection.ids.has(loan.id));
  const selectedOnPage = pageRows.filter((loan) => selection.ids.has(loan.id)).length;
  const pageState = selectionState(pageIds, selection.ids);
  const showCardCheckboxes = isMaterialTeam && (selecting || selectedLoans.length > 0);
  const firstDate = primaryDate(mode);
  const secondDate = firstDate === 'end' ? 'start' : 'end';

  const selectedHof = hoefe.data?.find((hof) => hof.id === hofId);
  const dateDay = fromDateInput(date, 'start');
  const chips: FilterChip[] = [
    ...(selectedHof === undefined
      ? []
      : [
          {
            key: 'hof',
            label: `${labels.hof[locale]}: ${selectedHof.name}`,
            onRemove: () => setHofId(''),
          },
        ]),
    ...(status === ''
      ? []
      : [
          {
            key: 'status',
            label: loanStatusLabel[status][locale],
            onRemove: () => setStatus(''),
          },
        ]),
    ...(dateDay === undefined
      ? []
      : [
          {
            key: 'date',
            label: `${labels.date[locale]}: ${formatDay(dateDay, locale)}`,
            onRemove: () => setDate(''),
          },
        ]),
    ...(showClosed
      ? [{ key: 'closed', label: text.closedChip[locale], onRemove: () => setShowClosed(false) }]
      : []),
  ];
  const clearFilters = (): void => {
    setHofId('');
    setStatus('');
    setDate('');
    setShowClosed(false);
    setSearch('');
  };

  const hofSelect = (
    <NativeSelect
      aria-label={labels.hof[locale]}
      value={hofId}
      onChange={(event) => setHofId(event.target.value)}
    >
      <option value="">{text.allHoefe[locale]}</option>
      {hoefe.data?.map((hof) => (
        <option key={hof.id} value={hof.id}>
          {hof.name}
        </option>
      ))}
    </NativeSelect>
  );
  const statusSelect = (
    <NativeSelect
      aria-label={labels.status[locale]}
      value={status}
      onChange={(event) => setStatus(event.target.value as MaterialLoanDisplayStatus | '')}
    >
      <option value="">{text.allStatus[locale]}</option>
      {Object.entries(loanStatusLabel).map(([value, label]) => (
        <option key={value} value={value}>
          {label[locale]}
        </option>
      ))}
    </NativeSelect>
  );
  const dateInput = (
    <DateInput value={date} onChange={setDate} label={labels.date[locale]} clearable />
  );
  const closedCheckbox = (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-gray-700">
      <input
        type="checkbox"
        className="accent-conveniat-green size-5"
        checked={showClosed}
        onChange={(event) => setShowClosed(event.target.checked)}
      />
      {text.showClosed[locale]}
    </label>
  );

  const toTop = (): void => listTop.current?.scrollIntoView({ block: 'start' });
  const togglePage = (): void => selection.setMany(pageIds, pageState !== 'all');
  const finishBulk = (results: BulkResult[]): void =>
    selection.setMany(
      results.filter((result) => result.ok).map((result) => result.id),
      false,
    );

  const onSort = (key: SortKey): void => setSort((current) => nextSort(current, key));
  const dateCell = (loan: MaterialLoan, which: 'start' | 'end'): React.ReactNode => (
    <span
      className={cn(
        'whitespace-nowrap',
        which === 'end' &&
          getLoanDisplayStatus(loan, now) === 'OVERDUE' &&
          'font-semibold text-red-700',
      )}
    >
      {formatDay(which === 'end' ? loan.endDate : loan.startDate, locale)}
    </span>
  );

  return (
    <>
      {linkedLoanMissing && (
        <div
          role="alert"
          className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
        >
          {format(labels.loanNotFound, locale, { n: openNumber })}
          <MaterialButton
            variant="ghost"
            aria-label={labels.close[locale]}
            className="px-0 sm:w-11"
            onClick={closeLoan}
          >
            <X aria-hidden />
          </MaterialButton>
        </div>
      )}
      {/* the container the table, the filters and the pager measure themselves against */}
      <div className="@container">
        <Panel className="scroll-mt-16">
          <span ref={listTop} className="block scroll-mt-16" />
          <FilterBar
            search={search}
            onSearch={setSearch}
            searchPlaceholder={text.search[locale]}
            chips={chips}
            onClearAll={clearFilters}
            resultCount={rows.length}
            inlineControls={
              <>
                {hofSelect}
                {statusSelect}
                {dateInput}
              </>
            }
            sheetControls={
              <>
                <Field label={labels.hof[locale]}>{hofSelect}</Field>
                <Field label={labels.status[locale]}>{statusSelect}</Field>
                <Field as="group" label={labels.date[locale]}>
                  {dateInput}
                </Field>
                <Field label={labels.sort[locale]}>
                  <NativeSelect
                    value={sortValue(sort)}
                    onChange={(event) =>
                      setSort(SHEET_SORTS.find((entry) => sortValue(entry) === event.target.value))
                    }
                  >
                    <option value="">{labels.sortDefault[locale]}</option>
                    {SHEET_SORTS.map((entry) =>
                      entry === undefined ? undefined : (
                        <option key={sortValue(entry)} value={sortValue(entry)}>
                          {format(
                            entry.direction === 'ascending'
                              ? labels.sortAscending
                              : labels.sortDescending,
                            locale,
                            { name: sortKeyLabel[entry.key][locale] },
                          )}
                        </option>
                      ),
                    )}
                  </NativeSelect>
                </Field>
                {closedCheckbox}
              </>
            }
          />

          <div className="flex min-h-12 items-center gap-2 border-b border-gray-100 px-2 text-sm text-gray-700 @[42rem]:px-4">
            {showCardCheckboxes && (
              <SelectCheckbox
                className="@[42rem]:hidden"
                state={pageState}
                label={labels.selectPage[locale]}
                onChange={togglePage}
              />
            )}
            <div className="hidden @[42rem]:block">{closedCheckbox}</div>
            <span className="ml-2 font-mono text-xs text-gray-500 tabular-nums @[42rem]:ml-auto">
              {format(text.count, locale, { n: rows.length })}
            </span>
            {isMaterialTeam && rows.length > 0 && (
              <MaterialButton
                variant="ghost"
                className="ml-auto @[42rem]:hidden"
                aria-pressed={showCardCheckboxes}
                onClick={() => {
                  if (showCardCheckboxes) {
                    selection.clear();
                    setSelecting(false);
                  } else {
                    setSelecting(true);
                  }
                }}
              >
                {showCardCheckboxes ? labels.selectDone[locale] : labels.select[locale]}
              </MaterialButton>
            )}
          </div>

          {rows.length === 0 && <EmptyState text={labels.empty[locale]} />}

          {/* narrow: one card per loan, the counter's next step as a full-width button */}
          <ul className="divide-y divide-gray-100 @[42rem]:hidden">
            {pageRows.map((loan) => {
              const selected = selection.ids.has(loan.id);
              const { primary, rest } = splitLoanActions(loan, isMaterialTeam);
              return (
                <li
                  key={loan.id}
                  className={cn(selected && 'shadow-conveniat-green shadow-[inset_3px_0_0]')}
                >
                  <div className="flex items-start">
                    {showCardCheckboxes && (
                      <SelectCheckbox
                        className="mt-2 ml-1"
                        state={selected ? 'all' : 'none'}
                        label={format(labels.selectRow, locale, {
                          name: `#${loan.number} ${loan.item.name}`,
                        })}
                        onChange={(shift) => selection.toggle(loan.id, { shift, pageIds })}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <LoanCard
                        loan={loan}
                        locale={locale}
                        now={now}
                        selected={selected}
                        {...(showCardCheckboxes ? { pressed: selected } : {})}
                        onOpen={(opened) =>
                          showCardCheckboxes
                            ? selection.toggle(opened.id)
                            : openLoanIn(opened, 'view')
                        }
                      />
                    </div>
                  </div>
                  {isMaterialTeam && !showCardCheckboxes && (
                    <div className="flex gap-2 px-4 pb-3">
                      {primary !== undefined && (
                        <LoanPrimaryAction
                          loan={loan}
                          action={primary}
                          locale={locale}
                          onOpen={openLoanIn}
                          className="min-w-0 flex-1"
                        />
                      )}
                      <div className={cn(primary === undefined && 'ml-auto')}>
                        <LoanActionMenu
                          loan={loan}
                          actions={rest}
                          locale={locale}
                          onOpen={openLoanIn}
                          variant="sheet"
                        />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/*
            wide: a table, from 42rem of list width. Measured on the list rather than the
            viewport, since the app's sidebar takes 480 px of a desktop screen, and in rem,
            since the app's root font grows with the screen. Quantity, Hof and person
            fold into the article cell until there is room for their own columns; the second
            date only shows on a wide screen.
          */}
          {rows.length > 0 && (
            <table className="hidden w-full table-fixed text-left text-sm @[42rem]:table">
              <thead>
                <tr className="[&>th]:sticky [&>th]:top-15 [&>th]:z-[5] [&>th]:bg-gray-50 [&>th]:shadow-[inset_0_-1px_0] [&>th]:shadow-gray-200">
                  {isMaterialTeam && (
                    <th className="w-12 pl-1">
                      <SelectCheckbox
                        state={pageState}
                        label={labels.selectPage[locale]}
                        onChange={togglePage}
                      />
                    </th>
                  )}
                  <th
                    className={cn(th, !isMaterialTeam && 'pl-4')}
                    {...sortProperties(sort, 'item')}
                  >
                    <SortHeader sortKey="item" sort={sort} onSort={onSort}>
                      {labels.article[locale]}
                    </SortHeader>
                  </th>
                  <th
                    className={cn(th, 'hidden w-20 text-right @[54rem]:table-cell')}
                    {...sortProperties(sort, 'quantity')}
                  >
                    <SortHeader sortKey="quantity" sort={sort} onSort={onSort} align="right">
                      {labels.quantity[locale]}
                    </SortHeader>
                  </th>
                  <th
                    className={cn(th, 'hidden w-28 @[54rem]:table-cell')}
                    {...sortProperties(sort, 'hof')}
                  >
                    <SortHeader sortKey="hof" sort={sort} onSort={onSort}>
                      {labels.hof[locale]}
                    </SortHeader>
                  </th>
                  <th className={cn(th, 'hidden w-40 @[64rem]:table-cell')}>
                    {labels.person[locale]}
                  </th>
                  <th
                    className={cn(th, 'hidden w-32 @[72rem]:table-cell')}
                    {...sortProperties(sort, secondDate)}
                  >
                    <SortHeader sortKey={secondDate} sort={sort} onSort={onSort}>
                      {columnLabel[secondDate][locale]}
                    </SortHeader>
                  </th>
                  <th className={cn(th, 'w-32')} {...sortProperties(sort, firstDate)}>
                    <SortHeader sortKey={firstDate} sort={sort} onSort={onSort}>
                      {columnLabel[firstDate][locale]}
                    </SortHeader>
                  </th>
                  <th className={cn(th, 'w-36')} {...sortProperties(sort, 'status')}>
                    <SortHeader sortKey="status" sort={sort} onSort={onSort}>
                      {labels.status[locale]}
                    </SortHeader>
                  </th>
                  <th className={cn(th, isMaterialTeam ? 'w-48 pr-3' : 'w-16 pr-3')}>
                    <span className="sr-only">{labels.action[locale]}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRows.map((loan) => {
                  const displayStatus = getLoanDisplayStatus(loan, now);
                  const selected = selection.ids.has(loan.id);
                  const { primary, rest } = splitLoanActions(loan, isMaterialTeam);
                  const holder = loanHolderName(loan);
                  const hofName = loanHofName(loan, locale);
                  const announced =
                    loan.returnAnnouncedAt instanceof Date && loan.status === 'ISSUED';
                  return (
                    <tr
                      key={loan.id}
                      aria-selected={isMaterialTeam ? selected : undefined}
                      className={cn(
                        'cursor-pointer hover:bg-gray-50',
                        displayStatus === 'OVERDUE' && 'bg-red-50/60',
                        selected && 'bg-conveniat-green/10 hover:bg-conveniat-green/15',
                      )}
                      onClick={() => openLoanIn(loan, 'view')}
                    >
                      {isMaterialTeam && (
                        <td
                          className={cn(
                            'pl-1',
                            selected && 'shadow-conveniat-green shadow-[inset_3px_0_0]',
                          )}
                        >
                          <SelectCheckbox
                            state={selected ? 'all' : 'none'}
                            label={format(labels.selectRow, locale, {
                              name: `#${loan.number} ${loan.item.name}`,
                            })}
                            onChange={(shift) => selection.toggle(loan.id, { shift, pageIds })}
                          />
                        </td>
                      )}
                      <td className={cn('py-2 pr-2', isMaterialTeam ? 'pl-2' : 'pl-4')}>
                        <button
                          type="button"
                          title={loan.item.name}
                          className={cn(
                            'block max-w-full cursor-pointer truncate rounded text-left font-semibold text-gray-900',
                            focusRing,
                          )}
                          onClick={(event) => {
                            event.stopPropagation();
                            openLoanIn(loan, 'view');
                          }}
                        >
                          <span className="font-bold tabular-nums @[54rem]:hidden">
                            {loanQuantity(loan)} ×{' '}
                          </span>
                          {loan.item.name}
                        </button>
                        <div className="flex min-w-0 items-center gap-1.5 text-xs text-gray-500">
                          <span className="shrink-0 font-mono">#{loan.number}</span>
                          <span
                            className="max-w-[50%] shrink-0 truncate font-semibold text-gray-700 @[54rem]:hidden"
                            title={hofName}
                          >
                            {hofName}
                          </span>
                          <span className="truncate @[64rem]:hidden" title={holder}>
                            {holder}
                          </span>
                          {announced && (
                            <CornerDownLeft
                              className="size-3.5 shrink-0 text-blue-700"
                              aria-label={labels.returnAnnounced[locale]}
                            />
                          )}
                        </div>
                      </td>
                      <td className="hidden px-2 py-2 text-right font-bold tabular-nums @[54rem]:table-cell">
                        {loanQuantity(loan)}
                      </td>
                      <td className="hidden truncate px-2 py-2 @[54rem]:table-cell" title={hofName}>
                        {hofName}
                      </td>
                      <td className="hidden truncate px-2 py-2 @[64rem]:table-cell" title={holder}>
                        {holder}
                      </td>
                      <td className="hidden px-2 py-2 @[72rem]:table-cell">
                        {dateCell(loan, secondDate)}
                      </td>
                      <td className="px-2 py-2">{dateCell(loan, firstDate)}</td>
                      <td className="px-2 py-2">
                        <LoanStatusBadge status={displayStatus} locale={locale} />
                      </td>
                      <td className="py-2 pr-3 pl-2">
                        <div className="flex items-center justify-end gap-2">
                          {primary !== undefined && (
                            <LoanPrimaryAction
                              loan={loan}
                              action={primary}
                              locale={locale}
                              onOpen={openLoanIn}
                              className="min-w-0 px-3"
                              short
                            />
                          )}
                          <LoanActionMenu
                            loan={loan}
                            actions={rest}
                            locale={locale}
                            onOpen={openLoanIn}
                            variant="menu"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <ListPager pagination={pagination} onNavigate={toTop} />

          {isMaterialTeam && selectedLoans.length > 0 && (
            <LoanBulkBar
              loans={selectedLoans}
              matchingCount={rows.length}
              onSelectAllMatching={() =>
                selection.setMany(
                  rows.map((loan) => loan.id),
                  true,
                )
              }
              offPageCount={selectedLoans.length - selectedOnPage}
              onClear={() => {
                selection.clear();
                setSelecting(false);
              }}
              onFinished={finishBulk}
            />
          )}
        </Panel>
      </div>

      {openLoan !== undefined && (
        <LoanDetailDialog
          key={`${openLoan.id}-${openMode}`}
          loan={openLoan}
          isMaterialTeam={isMaterialTeam}
          initialMode={openMode}
          onClose={closeLoan}
        />
      )}
    </>
  );
};
