'use client';

import {
  LoanCard,
  loanQuantity,
  LoanQuickAction,
  type LoanQuickMode,
} from '@/features/material/components/loan-card';
import {
  LoanDetailDialog,
  type LoanDialogMode,
} from '@/features/material/components/loan-detail-dialog';
import {
  format,
  formatDay,
  labels,
  loanStatusLabel,
} from '@/features/material/components/material-labels';
import { MaterialQueryError } from '@/features/material/components/material-query-error';
import { LoanStatusBadge } from '@/features/material/components/material-status-badge';
import {
  EmptyState,
  inputClass,
  LoadingState,
  MaterialButton,
  NativeSelect,
  Panel,
} from '@/features/material/components/material-ui';
import {
  MATERIAL_POLL_INTERVAL_MS,
  materialQueryOptions,
  useMaterialLocale,
  useNow,
  type MaterialLoan,
} from '@/features/material/hooks/use-material';
import { fromDateInput } from '@/features/material/utils/dates';
import { compareReturnQueue, isInReturnQueue } from '@/features/material/utils/returns';
import {
  getLoanDisplayStatus,
  type MaterialLoanDisplayStatus,
} from '@/features/material/utils/stock';
import { trpc } from '@/trpc/client';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronRight, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import type React from 'react';
import { useMemo, useState } from 'react';

export type LoanListMode = 'loans' | 'reservations' | 'returns';

const text = {
  filterPerson: { de: 'Person …', en: 'Person …', fr: 'Personne …' },
  filterItem: { de: 'Artikel …', en: 'Item …', fr: 'Article …' },
  filterDate: { de: 'Datum', en: 'Date', fr: 'Date' },
  allDepartments: { de: 'Alle Abteilungen', en: 'All departments', fr: 'Tous les groupes' },
  allStatus: { de: 'Alle Status', en: 'All statuses', fr: 'Tous les statuts' },
  count: { de: '{n} Einträge', en: '{n} entries', fr: '{n} entrées' },
  showClosed: {
    de: 'Abgeschlossene anzeigen',
    en: 'Show closed',
    fr: 'Afficher les terminés',
  },
} satisfies Record<string, StaticTranslationString>;

/** Which statuses the loans and reservations tabs list before any filter is applied. */
const MODE_STATUSES: Record<Exclude<LoanListMode, 'returns'>, MaterialLoanDisplayStatus[]> = {
  loans: ['ISSUED', 'RETURN_DUE', 'OVERDUE'],
  reservations: ['REQUESTED', 'RESERVED'],
};

const CLOSED = new Set<MaterialLoanDisplayStatus>(['RETURNED', 'CONSUMED', 'CANCELLED']);

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

/** Opens or closes a loan through `?loan=`, without a server round trip, so it works offline. */
const setLoanParameter = (loanNumber: number | undefined): void => {
  const url = new URL(globalThis.location.href);
  if (loanNumber === undefined) url.searchParams.delete('loan');
  else url.searchParams.set('loan', String(loanNumber));
  globalThis.history.replaceState(undefined, '', url.toString());
};

export const LoanListView: React.FC<{ mode: LoanListMode }> = ({ mode }) => {
  const locale = useMaterialLocale();
  const now = useNow();
  const searchParameters = useSearchParams();
  const [departmentId, setDepartmentId] = useState('');
  const [person, setPerson] = useState('');
  const [itemQuery, setItemQuery] = useState('');
  const [status, setStatus] = useState<MaterialLoanDisplayStatus | ''>('');
  const [date, setDate] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const [openMode, setOpenMode] = useState<LoanDialogMode>('view');

  // closed loans only when asked for; the open ones then all fit under the server's cap
  const openOnly = !showClosed && (status === '' || !CLOSED.has(status));
  const loans = trpc.material.getLoanList.useQuery(
    { openOnly },
    { ...materialQueryOptions, refetchInterval: MATERIAL_POLL_INTERVAL_MS },
  );
  const me = trpc.material.getMe.useQuery(undefined, materialQueryOptions);
  const departments = trpc.material.getDepartmentList.useQuery(undefined, materialQueryOptions);
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

  const openLoanIn = (loan: MaterialLoan, dialogMode: LoanDialogMode | LoanQuickMode): void => {
    setOpenMode(dialogMode);
    setLoanParameter(loan.number);
  };
  const closeLoan = (): void => {
    setOpenMode('view');
    setLoanParameter(undefined);
  };

  const visible = useMemo(() => {
    const personNeedle = person.trim().toLowerCase();
    const itemNeedle = itemQuery.trim().toLowerCase();
    const day = fromDateInput(date, 'start');
    const dayEnd = fromDateInput(date, 'end');

    return (loans.data ?? [])
      .filter((loan) => {
        const displayStatus = getLoanDisplayStatus(loan, now);
        if (status === '') {
          const shownClosed = showClosed && CLOSED.has(displayStatus);
          if (!shownClosed && !isInMode(mode, loan, displayStatus, now)) return false;
        } else if (displayStatus !== status) {
          return false;
        }
        if (departmentId !== '' && loan.department.id !== departmentId) return false;
        if (
          personNeedle !== '' &&
          !loan.responsibleName.toLowerCase().includes(personNeedle) &&
          !(loan.person?.name.toLowerCase().includes(personNeedle) ?? false)
        ) {
          return false;
        }
        if (itemNeedle !== '' && !loan.item.name.toLowerCase().includes(itemNeedle)) return false;
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
  }, [loans.data, mode, status, departmentId, person, itemQuery, date, showClosed, now]);

  if (loans.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!loans.data) return <MaterialQueryError error={loans.error} />;

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
            size="sm"
            aria-label={labels.close[locale]}
            onClick={closeLoan}
          >
            <X aria-hidden />
          </MaterialButton>
        </div>
      )}
      <Panel>
        <div className="grid grid-cols-2 gap-2 border-b border-gray-100 p-3 lg:grid-cols-5">
          <NativeSelect
            aria-label={labels.department[locale]}
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
          >
            <option value="">{text.allDepartments[locale]}</option>
            {departments.data?.map((department) => (
              <option key={department.id} value={department.id}>
                {department.shortName}
              </option>
            ))}
          </NativeSelect>
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
          <input
            type="search"
            className={inputClass}
            placeholder={text.filterItem[locale]}
            value={itemQuery}
            onChange={(event) => setItemQuery(event.target.value)}
          />
          <input
            type="search"
            className={inputClass}
            placeholder={text.filterPerson[locale]}
            value={person}
            onChange={(event) => setPerson(event.target.value)}
          />
          <input
            type="date"
            aria-label={text.filterDate[locale]}
            className={cn(inputClass, 'col-span-2 lg:col-span-1')}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2 text-sm text-gray-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-[#47564c]"
              checked={showClosed}
              onChange={(event) => setShowClosed(event.target.checked)}
            />
            {text.showClosed[locale]}
          </label>
          <span className="font-mono text-xs text-gray-500">
            {format(text.count, locale, { n: visible.length })}
          </span>
        </div>

        {visible.length === 0 && <EmptyState text={labels.empty[locale]} />}

        <ul className="divide-y divide-gray-100 lg:hidden">
          {visible.map((loan) => (
            <li key={loan.id} className="flex items-center">
              <div className="min-w-0 flex-1">
                <LoanCard
                  loan={loan}
                  locale={locale}
                  now={now}
                  onOpen={(opened) => openLoanIn(opened, 'view')}
                />
              </div>
              {isMaterialTeam && (
                <div className="shrink-0 pr-3">
                  <LoanQuickAction
                    loan={loan}
                    locale={locale}
                    isMaterialTeam={isMaterialTeam}
                    onOpen={openLoanIn}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>

        {visible.length > 0 && (
          <table className="hidden w-full text-left text-sm lg:table">
            <thead className="bg-gray-50 text-xs tracking-wide text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2 font-semibold">{labels.article[locale]}</th>
                <th className="px-2 py-2 text-right font-semibold">{labels.quantity[locale]}</th>
                <th className="px-2 py-2 font-semibold">{labels.department[locale]}</th>
                <th className="px-2 py-2 font-semibold">{labels.person[locale]}</th>
                <th className="px-2 py-2 font-semibold">{labels.startDate[locale]}</th>
                <th className="px-2 py-2 font-semibold">{labels.endDate[locale]}</th>
                <th className="px-2 py-2 font-semibold">{labels.status[locale]}</th>
                <th className="px-4 py-2 font-semibold">
                  <span className="sr-only">{labels.action[locale]}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((loan) => {
                const displayStatus = getLoanDisplayStatus(loan, now);
                return (
                  <tr
                    key={loan.id}
                    className={cn(
                      'cursor-pointer hover:bg-gray-50',
                      displayStatus === 'OVERDUE' && 'bg-red-50/60',
                    )}
                    onClick={() => openLoanIn(loan, 'view')}
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-gray-900">{loan.item.name}</div>
                      <div className="font-mono text-xs text-gray-400">#{loan.number}</div>
                    </td>
                    <td className="px-2 py-2.5 text-right font-bold tabular-nums">
                      {loanQuantity(loan)}
                    </td>
                    <td className="px-2 py-2.5" title={loan.department.name}>
                      {loan.department.shortName}
                    </td>
                    <td className="px-2 py-2.5">{loan.person?.name ?? loan.responsibleName}</td>
                    <td className="px-2 py-2.5 whitespace-nowrap">
                      {formatDay(loan.startDate, locale)}
                    </td>
                    <td className="px-2 py-2.5 whitespace-nowrap">
                      {formatDay(loan.endDate, locale)}
                    </td>
                    <td className="px-2 py-2.5">
                      <LoanStatusBadge status={displayStatus} locale={locale} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <LoanQuickAction
                          loan={loan}
                          locale={locale}
                          isMaterialTeam={isMaterialTeam}
                          onOpen={openLoanIn}
                        />
                        <button
                          type="button"
                          className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold whitespace-nowrap text-gray-700 hover:text-gray-900"
                          onClick={(event) => {
                            event.stopPropagation();
                            openLoanIn(loan, 'view');
                          }}
                        >
                          {labels.details[locale]}
                          <ChevronRight className="size-4" aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

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
