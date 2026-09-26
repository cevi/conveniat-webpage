'use client';

import {
  HolderAvatar,
  holderName,
  loanSummary,
  positionCount,
  SearchField,
  SectionTitle,
} from '@/features/material/components/counter-ui';
import { format, formatDay, labels } from '@/features/material/components/material-labels';
import { MaterialQueryError } from '@/features/material/components/material-query-error';
import {
  EmptyState,
  focusRing,
  LoadingState,
  MaterialButton,
  Panel,
} from '@/features/material/components/material-ui';
import { ReturnEditor } from '@/features/material/components/return-editor';
import {
  MATERIAL_POLL_INTERVAL_MS,
  materialQueryOptions,
  useDayEnd,
  useInvalidateMaterial,
  useMaterialLocale,
  useNow,
  type MaterialHolderGroup,
} from '@/features/material/hooks/use-material';
import { useSearchHistory } from '@/features/material/hooks/use-search-history';
import {
  holderFromSearch,
  holderOf,
  holderSearch,
  type LoanHolder,
} from '@/features/material/utils/holders';
import { parseScan } from '@/features/material/utils/scan';
import { trpc } from '@/trpc/client';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Building2, ChevronRight, Hash, PackageCheck, SlidersHorizontal, User } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

const text = {
  dueToday: { de: 'Heute fällig', en: 'Due today', fr: 'À rendre aujourd’hui' },
  nothingDue: {
    de: 'Heute ist nichts fällig.',
    en: 'Nothing is due today.',
    fr: 'Rien à rendre aujourd’hui.',
  },
  allOk: { de: 'Alles OK zurück', en: 'All back, all fine', fr: 'Tout rendu, OK' },
  allOkAsk: {
    de: '{lines} vollständig und ohne Schaden zurücknehmen?',
    en: 'Take back {lines} complete and undamaged?',
    fr: 'Reprendre {lines} complets et sans dégât ?',
  },
  yesTakeBack: { de: 'Ja, zurück', en: 'Yes, take back', fr: 'Oui, reprendre' },
  deviation: { de: 'Abweichung', en: 'Deviation', fr: 'Écart' },
  find: { de: 'Suchen oder scannen', en: 'Search or scan', fr: 'Chercher ou scanner' },
  search: {
    de: 'Hof, Person oder Ausleihe #',
    en: 'Hof, person or loan #',
    fr: 'Hof, personne ou prêt n°',
  },
  openLoan: { de: 'Ausleihe #{n} öffnen', en: 'Open loan #{n}', fr: 'Ouvrir le prêt n° {n}' },
  out: { de: '{n} draussen', en: '{n} out', fr: '{n} dehors' },
  nobodyOut: {
    de: 'Niemand hat gerade Material draussen.',
    en: 'Nobody has material out right now.',
    fr: 'Personne n’a de matériel dehors.',
  },
  done: {
    de: 'Zurückgenommen: {n} Stück',
    en: 'Taken back: {n} pieces',
    fr: 'Repris : {n} pièces',
  },
  notALoan: {
    de: 'Scanne ein Ausleih-Etikett oder suche den Hof.',
    en: 'Scan a loan label or search the Hof.',
    fr: 'Scanne une étiquette de prêt ou cherche le Hof.',
  },
} satisfies Record<string, StaticTranslationString>;

/** One holder with material due: back complete in one tap, or open to note what is off. */
const DueCard: React.FC<{
  group: MaterialHolderGroup;
  onOpen: (holder: LoanHolder) => void;
}> = ({ group, onOpen }) => {
  const locale = useMaterialLocale();
  const now = useNow();
  const invalidate = useInvalidateMaterial();
  const giveBack = trpc.material.returnLoanBasket.useMutation();
  const [asking, setAsking] = useState(false);
  const name = holderName(group, locale);
  const oldest = group.loans[0];
  const overdue = oldest !== undefined && oldest.endDate < now;
  const lines = positionCount(group.loans.length, locale);

  const takeBackAll = (): void => {
    giveBack.mutate(
      {
        lines: group.loans.map((loan) => ({
          loanId: loan.id,
          returnedQuantity: loan.issuedQuantity ?? loan.quantity,
          condition: 'OK' as const,
        })),
      },
      {
        onSuccess: (result) => {
          toast.success(format(text.done, locale, { n: result.pieces }));
          setAsking(false);
          void invalidate();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <Panel className="space-y-3 p-3">
      <div className="flex items-start gap-3">
        <HolderAvatar name={name} alert={overdue} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {group.holder.kind === 'PERSON' && (
              <User className="size-4 shrink-0 text-gray-500" aria-hidden />
            )}
            <span className="min-w-0 truncate font-bold text-gray-900">{name}</span>
            {overdue && (
              <span className="ml-auto shrink-0 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                {labels.overdue[locale]}
              </span>
            )}
          </div>
          <p className="line-clamp-2 text-sm text-gray-600">{loanSummary(group.loans)}</p>
          <p className={cn('text-xs', overdue ? 'font-semibold text-red-700' : 'text-gray-500')}>
            {lines} ·{' '}
            {oldest !== undefined && overdue
              ? format(labels.overdueSince, locale, { day: formatDay(oldest.endDate, locale) })
              : labels.dueToday[locale]}
          </p>
        </div>
      </div>
      {asking ? (
        <div className="space-y-2 rounded-xl bg-gray-50 p-2">
          <p className="px-1 text-sm font-semibold text-gray-800">
            {format(text.allOkAsk, locale, { lines })}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <MaterialButton variant="ghost" onClick={() => setAsking(false)}>
              {labels.cancel[locale]}
            </MaterialButton>
            <MaterialButton loading={giveBack.isPending} onClick={takeBackAll}>
              {text.yesTakeBack[locale]}
            </MaterialButton>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-[minmax(0,1fr)_auto]">
          <MaterialButton onClick={() => setAsking(true)}>
            <PackageCheck aria-hidden />
            {text.allOk[locale]}
          </MaterialButton>
          <MaterialButton variant="secondary" onClick={() => onOpen(group.holder)}>
            <SlidersHorizontal aria-hidden />
            {text.deviation[locale]}
          </MaterialButton>
        </div>
      )}
    </Panel>
  );
};

const DueReturns: React.FC<{ onOpen: (holder: LoanHolder) => void }> = ({ onOpen }) => {
  const locale = useMaterialLocale();
  const dayEnd = useDayEnd();
  const queue = trpc.material.getCounterQueue.useQuery(
    { dayEnd },
    { ...materialQueryOptions, refetchInterval: MATERIAL_POLL_INTERVAL_MS },
  );
  if (queue.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!queue.data) return <MaterialQueryError error={queue.error} />;
  const { returns } = queue.data;
  return (
    <section className="space-y-3">
      <SectionTitle count={returns.length}>{text.dueToday[locale]}</SectionTitle>
      {returns.length === 0 ? (
        <Panel>
          <EmptyState text={text.nothingDue[locale]} />
        </Panel>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {returns.map((group) => (
            <DueCard key={group.key} group={group} onOpen={onOpen} />
          ))}
        </div>
      )}
    </section>
  );
};

const rowButton = cn(
  'flex min-h-14 w-full cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-gray-50',
  focusRing,
  'focus-visible:ring-inset',
);

/** Everybody with material out, found by name, or a loan by the number on its label. */
const HolderSearch: React.FC<{
  onOpen: (holder: LoanHolder) => void;
  onOpenLoan: (number: number) => void;
}> = ({ onOpen, onOpenLoan }) => {
  const locale = useMaterialLocale();
  const [query, setQuery] = useState('');
  const holders = trpc.material.getHolderList.useQuery(undefined, materialQueryOptions);
  const needle = query.trim().toLowerCase();
  const loanNumber = /^#?(\d+)$/.exec(needle)?.[1];
  const rows = [
    ...(holders.data?.hoefe ?? [])
      .filter((hof) => hof.out > 0)
      .map((hof) => ({
        holder: { kind: 'HOF', id: hof.id } as const,
        name: hof.name,
        out: hof.out,
      })),
    ...(holders.data?.people ?? []).map((person) => ({
      holder: { kind: 'PERSON', id: person.uuid } as const,
      name: person.name,
      out: person.out,
    })),
  ].filter((row) => row.name.toLowerCase().includes(needle));

  return (
    <section className="space-y-3">
      <SectionTitle>{text.find[locale]}</SectionTitle>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder={text.search[locale]}
        onSubmit={() => {
          if (loanNumber !== undefined) onOpenLoan(Number(loanNumber));
        }}
        onScan={(value) => {
          const scanned = parseScan(value, globalThis.location.origin);
          if (scanned?.kind !== 'loan') {
            toast.error(text.notALoan[locale]);
            return false;
          }
          onOpenLoan(scanned.number);
          return true;
        }}
      />
      <Panel>
        {loanNumber !== undefined && (
          <button
            type="button"
            className={rowButton}
            onClick={() => onOpenLoan(Number(loanNumber))}
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
              <Hash className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold text-gray-900">
              {format(text.openLoan, locale, { n: loanNumber })}
            </span>
            <ChevronRight className="size-4 shrink-0 text-gray-400" aria-hidden />
          </button>
        )}
        {holders.isLoading && <LoadingState text={labels.loading[locale]} />}
        {!holders.isLoading && rows.length === 0 && loanNumber === undefined && (
          <EmptyState text={needle === '' ? text.nobodyOut[locale] : labels.empty[locale]} />
        )}
        <ul className="divide-y divide-gray-100">
          {rows.map((row) => (
            <li key={`${row.holder.kind}:${row.holder.id}`}>
              <button type="button" className={rowButton} onClick={() => onOpen(row.holder)}>
                <HolderAvatar name={row.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-gray-900">{row.name}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    {row.holder.kind === 'HOF' ? (
                      <Building2 className="size-3" aria-hidden />
                    ) : (
                      <User className="size-3" aria-hidden />
                    )}
                    {format(text.out, locale, { n: row.out })}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-gray-400" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </section>
  );
};

/** A scanned loan label: finds whoever has the loan and opens their take-back. */
const ScannedLoan: React.FC<{ number: number; onClose: () => void }> = ({ number, onClose }) => {
  const locale = useMaterialLocale();
  const loan = trpc.material.getLoan.useQuery({ number }, materialQueryOptions);
  if (loan.isLoading) return <LoadingState text={labels.loading[locale]} />;
  const holder = loan.data === undefined ? undefined : holderOf(loan.data);
  if (holder === undefined) {
    return (
      <div className="space-y-3">
        <MaterialQueryError error={loan.error} />
        <MaterialButton variant="secondary" className="w-full" onClick={onClose}>
          {labels.back[locale]}
        </MaterialButton>
      </div>
    );
  }
  return <ReturnEditor holder={holder} scannedNumber={number} onClose={onClose} />;
};

/**
 * The take-back screen. On top, whoever has material due today or overdue, each back complete
 * in one tap; below, anybody with material out by name, or a loan label scanned. A holder
 * opens under `?hof=`, `?person=` or `?loan=`, the addresses the overview and the labels use.
 */
export const TakeBackView: React.FC = () => {
  const parameters = useSearchParams();
  const history = useSearchHistory();
  const holder = holderFromSearch(parameters);
  const loanParameter = Number(parameters.get('loan') ?? '');
  const loanNumber =
    Number.isSafeInteger(loanParameter) && loanParameter > 0 ? loanParameter : undefined;

  if (holder !== undefined) {
    return <ReturnEditor key={holderSearch(holder)} holder={holder} onClose={history.close} />;
  }
  if (loanNumber !== undefined) {
    return <ScannedLoan key={loanNumber} number={loanNumber} onClose={history.close} />;
  }
  return (
    <div className="space-y-6">
      <DueReturns onOpen={(next) => history.open(holderSearch(next))} />
      <HolderSearch
        onOpen={(next) => history.open(holderSearch(next))}
        onOpenLoan={(number) => history.open(`loan=${number}`)}
      />
    </div>
  );
};
