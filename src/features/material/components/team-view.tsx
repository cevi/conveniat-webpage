'use client';

import type { MaterialWarning } from '@/features/material/api/material-router';
import { DepotStructurePanel } from '@/features/material/components/depot-structure-panel';
import { ItemEditDialog } from '@/features/material/components/item-edit-dialog';
import { LoanCard } from '@/features/material/components/loan-card';
import { LoanDetailDialog } from '@/features/material/components/loan-detail-dialog';
import { MaterialItemImage } from '@/features/material/components/material-item-image';
import {
  conditionLabel,
  format,
  formatDateTime,
  labels,
} from '@/features/material/components/material-labels';
import { ListPager } from '@/features/material/components/material-list-controls';
import { MaterialQueryError } from '@/features/material/components/material-query-error';
import { ItemStatusBadge } from '@/features/material/components/material-status-badge';
import {
  EmptyState,
  focusRing,
  inputClass,
  LoadingState,
  MaterialButton,
  Panel,
  StatTile,
} from '@/features/material/components/material-ui';
import { usePagination } from '@/features/material/hooks/use-list-state';
import {
  MATERIAL_POLL_INTERVAL_MS,
  materialQueryOptions,
  useInvalidateMaterial,
  useMaterialLocale,
  useNow,
  type MaterialItem,
  type MaterialLoan,
} from '@/features/material/hooks/use-material';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { AlertTriangle, Check, Pencil, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

const text = {
  articles: { de: 'Artikel', en: 'Items', fr: 'Articles' },
  stock: { de: 'Materialbestand', en: 'Stock', fr: 'Stock' },
  loans: { de: 'Ausleihen', en: 'Loans', fr: 'Prêts' },
  toIssue: { de: 'Heute ausgeben', en: 'Hand out today', fr: 'À remettre' },
  toReturn: { de: 'Heute zurück', en: 'Back today', fr: 'Retours du jour' },
  overdue: { de: 'Überfällig', en: 'Overdue', fr: 'En retard' },
  requests: { de: 'Offene Anfragen', en: 'Open requests', fr: 'Demandes ouvertes' },
  next24h: { de: 'nächste 24 h', en: 'next 24 h', fr: 'prochaines 24 h' },
  announced: { de: 'Rückgabe gemeldet', en: 'Return announced', fr: 'Retour annoncé' },
  warnings: { de: 'Warnungen', en: 'Warnings', fr: 'Alertes' },
  incidents: { de: 'Schadensmeldungen', en: 'Damage reports', fr: 'Signalements' },
  resolve: { de: 'Erledigt', en: 'Done', fr: 'Traité' },
  confirmAll: { de: 'Bestätigen', en: 'Confirm', fr: 'Confirmer' },
  stockTable: { de: 'Bestand bearbeiten', en: 'Edit stock', fr: 'Modifier le stock' },
  newItem: { de: 'Neuer Artikel', en: 'New item', fr: 'Nouvel article' },
  reportedBy: { de: 'von {name}', en: 'by {name}', fr: 'par {name}' },
  searchItems: { de: 'Artikel suchen …', en: 'Search items …', fr: 'Chercher un article …' },
} satisfies Record<string, StaticTranslationString>;

const warningText = {
  OVERDUE: {
    de: 'Überfällig: Ausleihe #{n} ({item}, {hof})',
    en: 'Overdue: loan #{n} ({item}, {hof})',
    fr: 'En retard : prêt n° {n} ({item}, {hof})',
  },
  LOW_STOCK: {
    de: 'Bestand zu niedrig: {item}, noch {n} frei',
    en: 'Low stock: {item}, {n} left',
    fr: 'Stock bas : {item}, encore {n}',
  },
  DAMAGED: {
    de: 'Beschädigt: {n} × {item}',
    en: 'Damaged: {n} × {item}',
    fr: 'Endommagé : {n} × {item}',
  },
  IN_REPAIR: {
    de: 'In Reparatur: {n} × {item}',
    en: 'In repair: {n} × {item}',
    fr: 'En réparation : {n} × {item}',
  },
  OVERBOOKED: {
    de: 'Reservationen überschneiden sich: {item}, es fehlen {n}',
    en: 'Reservations overlap: {item}, {n} short',
    fr: 'Réservations qui se chevauchent : {item}, il manque {n}',
  },
  MAX_REACHED: {
    de: 'Maximale Ausleihmenge erreicht: {item} ist vollständig vergeben',
    en: 'Maximum reached: {item} is fully booked',
    fr: 'Maximum atteint : {item} est entièrement réservé',
  },
} satisfies Record<MaterialWarning['kind'], StaticTranslationString>;

const warningTone: Record<MaterialWarning['kind'], string> = {
  OVERDUE: 'border-red-200 bg-red-50 text-red-900',
  OVERBOOKED: 'border-red-200 bg-red-50 text-red-900',
  LOW_STOCK: 'border-amber-200 bg-amber-50 text-amber-900',
  MAX_REACHED: 'border-amber-200 bg-amber-50 text-amber-900',
  DAMAGED: 'border-gray-200 bg-gray-50 text-gray-800',
  IN_REPAIR: 'border-gray-200 bg-gray-50 text-gray-800',
};

const describeWarning = (warning: MaterialWarning, locale: Locale): string => {
  switch (warning.kind) {
    case 'OVERDUE': {
      return format(warningText.OVERDUE, locale, {
        n: warning.loanNumber,
        item: warning.itemName,
        // a dashboard cached before the Höfe has no `hofName`
        hof: warning.hofName ?? labels.unknownHof[locale],
      });
    }
    case 'LOW_STOCK': {
      return format(warningText.LOW_STOCK, locale, {
        item: warning.itemName,
        n: warning.available,
      });
    }
    case 'OVERBOOKED': {
      return format(warningText.OVERBOOKED, locale, {
        item: warning.itemName,
        n: warning.missing,
      });
    }
    case 'MAX_REACHED': {
      return format(warningText.MAX_REACHED, locale, { item: warning.itemName });
    }
    default: {
      return format(warningText[warning.kind], locale, {
        item: warning.itemName,
        n: warning.quantity,
      });
    }
  }
};

const warningHref = (warning: MaterialWarning): string =>
  warning.kind === 'OVERDUE'
    ? `/app/material/returns?loan=${warning.loanNumber}`
    : `/app/material/catalog?item=${encodeURIComponent(warning.itemCode)}`;

const showError = (error: { message: string }): void => {
  toast.error(error.message);
};

/** Confirms a request straight from the queue, without opening the loan. */
const ConfirmLoanButton: React.FC<{ loan: MaterialLoan }> = ({ loan }) => {
  const locale = useMaterialLocale();
  const invalidate = useInvalidateMaterial();
  const confirm = trpc.material.confirmLoan.useMutation();
  return (
    <MaterialButton
      className="w-11 px-0"
      aria-label={`${text.confirmAll[locale]}: ${format(labels.loanNumber, locale, { n: loan.number })}`}
      title={text.confirmAll[locale]}
      loading={confirm.isPending}
      // stays off until the refetch removes the row; a second tap would only fail
      disabled={confirm.isSuccess}
      onClick={() =>
        confirm.mutate({ id: loan.id }, { onSuccess: () => void invalidate(), onError: showError })
      }
    >
      <Check aria-hidden />
    </MaterialButton>
  );
};

/** How many loans a queue shows before it asks; more come in steps of this size. */
const QUEUE_STEP = 5;

/**
 * One of the counter's queues. The first few loans show, and "load more" adds the next ones
 * below: a scroll area inside the page would trap a thumb that meant to scroll the page.
 */
const Queue: React.FC<{
  title: string;
  loans: MaterialLoan[];
  onOpen: (loan: MaterialLoan) => void;
  now: Date;
  canConfirm?: boolean;
}> = ({ title, loans, onOpen, now, canConfirm = false }) => {
  const locale = useMaterialLocale();
  const [shown, setShown] = useState(QUEUE_STEP);
  return (
    <Panel
      title={title}
      action={<span className="text-xs text-gray-500 tabular-nums">{loans.length}</span>}
    >
      {loans.length === 0 ? (
        <EmptyState text={labels.empty[locale]} />
      ) : (
        <ul className="divide-y divide-gray-100">
          {loans.slice(0, shown).map((loan) => (
            <li key={loan.id} className="flex items-center">
              <div className="min-w-0 flex-1">
                <LoanCard loan={loan} locale={locale} now={now} onOpen={onOpen} />
              </div>
              {canConfirm && (
                <div className="pr-3">
                  <ConfirmLoanButton loan={loan} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {loans.length > shown && (
        <div className="border-t border-gray-100 p-3">
          <MaterialButton
            variant="secondary"
            className="w-full"
            onClick={() => setShown((count) => count + QUEUE_STEP * 2)}
          >
            {labels.loadMore[locale]}
            <span className="text-gray-500 tabular-nums">
              ({format(labels.shownOf, locale, { n: shown, total: loans.length })})
            </span>
          </MaterialButton>
        </div>
      )}
    </Panel>
  );
};

/**
 * Every article with its stock, to edit. Searchable and paged: the depot holds hundreds of
 * articles, and a phone should not render all of them at once.
 */
const StockList: React.FC<{
  items: MaterialItem[];
  onEdit: (item: MaterialItem) => void;
}> = ({ items, onEdit }) => {
  const locale = useMaterialLocale();
  const [query, setQuery] = useState('');
  const listTop = useRef<HTMLDivElement>(null);
  const needle = query.trim().toLowerCase();
  const visible = items.filter(
    (item) =>
      needle === '' ||
      item.name.toLowerCase().includes(needle) ||
      item.code.toLowerCase().includes(needle),
  );
  const pagination = usePagination(visible.length, needle);
  const pageItems = visible.slice(pagination.slice.start, pagination.slice.end);

  return (
    <div ref={listTop} className="@container scroll-mt-16">
      <div className="border-b border-gray-100 p-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            aria-label={text.searchItems[locale]}
            placeholder={text.searchItems[locale]}
            className={cn(inputClass, 'pl-9')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      {pageItems.length === 0 && <EmptyState text={labels.empty[locale]} />}
      <ul className="divide-y divide-gray-100">
        {pageItems.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-2 pr-2 pl-4">
            <MaterialItemImage name={item.name} imageUrl={item.imageUrl} className="size-10" />
            <Link
              href={`/app/material/catalog?item=${encodeURIComponent(item.code)}`}
              className={cn('min-w-0 flex-1 rounded', focusRing)}
            >
              <div className="truncate font-semibold text-gray-900" title={item.name}>
                {item.name}
              </div>
              <div className="truncate font-mono text-xs text-gray-500">
                {item.stock.available}/{item.totalQuantity} {item.unit}
                {item.damagedQuantity > 0 &&
                  ` · ${item.damagedQuantity} ${labels.damagedShort[locale]}`}
              </div>
            </Link>
            <span className="hidden @[28rem]:inline-flex">
              <ItemStatusBadge status={item.status} locale={locale} />
            </span>
            <MaterialButton
              variant="ghost"
              className="w-11 px-0"
              aria-label={`${labels.edit[locale]}: ${item.name}`}
              onClick={() => onEdit(item)}
            >
              <Pencil aria-hidden />
            </MaterialButton>
          </li>
        ))}
      </ul>
      <ListPager
        pagination={pagination}
        onNavigate={() => listTop.current?.scrollIntoView({ block: 'start' })}
      />
    </div>
  );
};

export const TeamView: React.FC = () => {
  const locale = useMaterialLocale();
  const now = useNow();
  const invalidate = useInvalidateMaterial();
  const dashboard = trpc.material.getTeamDashboard.useQuery(undefined, {
    ...materialQueryOptions,
    refetchInterval: MATERIAL_POLL_INTERVAL_MS,
    // the incident photo links expire after an hour, a restored copy would show broken images
    meta: { persist: false },
  });
  const resolve = trpc.material.resolveIncident.useMutation();
  const [openLoan, setOpenLoan] = useState<MaterialLoan | undefined>();
  const [editing, setEditing] = useState<MaterialItem | 'new' | undefined>();

  if (dashboard.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!dashboard.data) return <MaterialQueryError error={dashboard.error} />;
  const data = dashboard.data;
  // an announced loan that is also due today is one return, not two
  const announcedIds = new Set(data.announced.map((loan) => loan.id));
  const returnsToday = [
    ...data.announced,
    ...data.toReturn.filter((loan) => !announcedIds.has(loan.id)),
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-2 text-xs font-bold tracking-widest text-gray-500 uppercase">
          {text.loans[locale]}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label={text.toIssue[locale]}
            value={data.toIssue.length}
            hint={text.next24h[locale]}
          />
          <StatTile
            label={text.toReturn[locale]}
            value={returnsToday.length}
            hint={`${data.announced.length} ${text.announced[locale]}`}
          />
          <StatTile label={text.overdue[locale]} value={data.overdue.length} tone="red" />
          <StatTile label={text.requests[locale]} value={data.requested.length} tone="blue" />
        </div>
      </div>

      {data.warnings.length > 0 && (
        <Panel
          title={text.warnings[locale]}
          action={<AlertTriangle className="size-4 text-amber-500" aria-hidden />}
        >
          <ul className="grid gap-2 p-3 sm:grid-cols-2">
            {data.warnings.map((warning, index) => (
              <li key={`${warning.kind}-${index}`}>
                <Link
                  href={warningHref(warning)}
                  className={cn(
                    'block rounded-lg border px-3 py-2 text-sm hover:opacity-80',
                    warningTone[warning.kind],
                  )}
                >
                  {describeWarning(warning, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Queue
          title={text.requests[locale]}
          loans={data.requested}
          onOpen={setOpenLoan}
          now={now}
          canConfirm
        />
        <Queue title={text.toIssue[locale]} loans={data.toIssue} onOpen={setOpenLoan} now={now} />
        <Queue title={text.toReturn[locale]} loans={returnsToday} onOpen={setOpenLoan} now={now} />
        <Queue title={text.overdue[locale]} loans={data.overdue} onOpen={setOpenLoan} now={now} />
      </div>

      {/* the counter's work comes first; the stock figures are for the quieter moments */}
      <div>
        <h2 className="mb-2 text-xs font-bold tracking-widest text-gray-500 uppercase">
          {text.stock[locale]}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 2xl:grid-cols-7">
          <StatTile label={text.articles[locale]} value={data.stats.articles} />
          <StatTile label={labels.total[locale]} value={data.stats.total} />
          <StatTile label={labels.available[locale]} value={data.stats.available} tone="green" />
          <StatTile label={labels.issued[locale]} value={data.stats.issued} tone="orange" />
          <StatTile label={labels.reserved[locale]} value={data.stats.reserved} tone="blue" />
          <StatTile label={labels.damaged[locale]} value={data.stats.damaged} tone="red" />
          <StatTile label={labels.inRepair[locale]} value={data.stats.inRepair} />
        </div>
      </div>

      <Panel title={text.incidents[locale]}>
        {data.incidents.length === 0 ? (
          <EmptyState text={labels.empty[locale]} />
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.incidents.map((incident) => (
              <li key={incident.id} className="flex items-start gap-3 px-4 py-3">
                {incident.photoUrl !== null && (
                  <a href={incident.photoUrl} target="_blank" rel="noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element -- presigned bucket URL */}
                    <img
                      src={incident.photoUrl}
                      alt=""
                      className="size-16 rounded-lg object-cover"
                    />
                  </a>
                )}
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-semibold text-gray-900">
                    {incident.quantity} × {incident.item.name} ·{' '}
                    {conditionLabel[incident.condition][locale]}
                  </div>
                  {incident.note !== '' && <p className="text-gray-700">{incident.note}</p>}
                  <div className="text-xs text-gray-500">
                    {formatDateTime(incident.createdAt, locale)}
                    {incident.loan !== null && ` · #${incident.loan.number}`}
                    {incident.reportedBy?.name !== undefined &&
                      ` · ${format(text.reportedBy, locale, { name: incident.reportedBy.name })}`}
                  </div>
                </div>
                <MaterialButton
                  variant="secondary"
                  loading={resolve.isPending && resolve.variables.id === incident.id}
                  disabled={resolve.isSuccess && resolve.variables.id === incident.id}
                  onClick={() =>
                    resolve.mutate(
                      { id: incident.id },
                      { onSuccess: () => void invalidate(), onError: showError },
                    )
                  }
                >
                  {text.resolve[locale]}
                </MaterialButton>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title={text.stockTable[locale]}
        action={
          <div className="flex flex-wrap gap-2">
            <MaterialButton onClick={() => setEditing('new')}>
              <Plus aria-hidden />
              {text.newItem[locale]}
            </MaterialButton>
          </div>
        }
      >
        <StockList items={data.items} onEdit={setEditing} />
      </Panel>

      <DepotStructurePanel />

      {openLoan !== undefined && (
        <LoanDetailDialog loan={openLoan} isMaterialTeam onClose={() => setOpenLoan(undefined)} />
      )}
      {editing !== undefined && (
        <ItemEditDialog
          {...(editing === 'new' ? {} : { item: editing })}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
};
