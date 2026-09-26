'use client';

import { LoanCard, loanQuantity } from '@/features/material/components/loan-card';
import { LoanDetailDialog } from '@/features/material/components/loan-detail-dialog';
import { format, labels } from '@/features/material/components/material-labels';
import { MaterialQueryError } from '@/features/material/components/material-query-error';
import {
  EmptyState,
  LoadingState,
  Panel,
  StatTile,
} from '@/features/material/components/material-ui';
import {
  MATERIAL_POLL_INTERVAL_MS,
  materialQueryOptions,
  useMaterialLocale,
  useNow,
  type MaterialLoan,
} from '@/features/material/hooks/use-material';
import { getLoanDisplayStatus } from '@/features/material/utils/stock';
import { trpc } from '@/trpc/client';
import type { StaticTranslationString } from '@/types/types';
import { Building2, PackageSearch, ScanLine, User } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useMemo, useState } from 'react';

const text = {
  current: { de: 'Aktuelle Ausleihen', en: 'Current loans', fr: 'Prêts en cours' },
  upcoming: {
    de: 'Bevorstehende Reservationen',
    en: 'Upcoming reservations',
    fr: 'Réservations à venir',
  },
  openReturns: { de: 'Offene Rückgaben', en: 'Open returns', fr: 'Retours en attente' },
  overdue: { de: 'Überfälliges Material', en: 'Overdue material', fr: 'Matériel en retard' },
  dueSoon: { de: 'in den nächsten 24 h', en: 'in the next 24 h', fr: 'dans les 24 h' },
  requested: { de: '{n} angefragt', en: '{n} requested', fr: '{n} demandés' },
  bringBack: { de: 'sofort zurückbringen', en: 'bring back now', fr: 'à rendre tout de suite' },
  out: { de: 'unterwegs', en: 'out', fr: 'dehors' },
  findMaterial: { de: 'Material suchen', en: 'Find material', fr: 'Chercher du matériel' },
  scan: { de: 'QR-Code scannen', en: 'Scan QR code', fr: 'Scanner un code QR' },
  withMe: { de: 'Bei mir', en: 'With me', fr: 'Chez moi' },
  mine: { de: 'Was wir haben', en: 'What we have', fr: 'Ce que nous avons' },
  nothingOut: {
    de: 'Aktuell ist nichts ausgeliehen.',
    en: 'Nothing is out right now.',
    fr: 'Rien n’est prêté pour le moment.',
  },
} satisfies Record<string, StaticTranslationString>;

interface HolderLine {
  name: string;
  quantity: number;
  unit: string;
}

interface Holder {
  key: string;
  label: string;
  icon: 'department' | 'person';
  lines: Map<string, HolderLine>;
}

/**
 * What a department or a person has right now, one line per article, the way it would show
 * in the app: "AVP – 10 × Wolldecke, 2 × Handbeil".
 */
const useHolders = (
  loans: MaterialLoan[],
  me: { uuid: string; departments: { id: string; shortName: string }[] } | undefined,
): Holder[] =>
  useMemo(() => {
    if (me === undefined) return [];
    const holders = new Map<string, Holder>();
    const add = (holder: Omit<Holder, 'lines'>, loan: MaterialLoan): void => {
      const entry = holders.get(holder.key) ?? { ...holder, lines: new Map<string, HolderLine>() };
      const line = entry.lines.get(loan.item.id) ?? {
        name: loan.item.name,
        quantity: 0,
        unit: loan.item.unit,
      };
      line.quantity += loanQuantity(loan);
      entry.lines.set(loan.item.id, line);
      holders.set(holder.key, entry);
    };
    for (const loan of loans) {
      if (loan.status !== 'ISSUED') continue;
      if (loan.person?.uuid === me.uuid) {
        add({ key: 'me', label: loan.person.name, icon: 'person' }, loan);
      } else if (me.departments.some((department) => department.id === loan.department.id)) {
        add(
          { key: loan.department.id, label: loan.department.shortName, icon: 'department' },
          loan,
        );
      }
    }
    return [...holders.values()];
  }, [loans, me]);

const LoanSection: React.FC<{
  title: string;
  loans: MaterialLoan[];
  onOpen: (loan: MaterialLoan) => void;
  now: Date;
}> = ({ title, loans, onOpen, now }) => {
  const locale = useMaterialLocale();
  return (
    <Panel title={title} action={<span className="text-xs text-gray-500">{loans.length}</span>}>
      {loans.length === 0 ? (
        <EmptyState text={labels.empty[locale]} />
      ) : (
        <ul className="divide-y divide-gray-100">
          {loans.slice(0, 8).map((loan) => (
            <li key={loan.id}>
              <LoanCard loan={loan} locale={locale} now={now} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};

export const OverviewView: React.FC = () => {
  const locale = useMaterialLocale();
  const now = useNow();
  // only open loans: the newest 500 of all loans could leave an old overdue one out
  const loans = trpc.material.getLoanList.useQuery(
    { openOnly: true },
    { ...materialQueryOptions, refetchInterval: MATERIAL_POLL_INTERVAL_MS },
  );
  const me = trpc.material.getMe.useQuery(undefined, materialQueryOptions);
  const [openLoan, setOpenLoan] = useState<MaterialLoan | undefined>();
  const holders = useHolders(loans.data ?? [], me.data);

  if (loans.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!loans.data) return <MaterialQueryError error={loans.error} />;

  const withStatus = loans.data.map((loan) => ({ loan, status: getLoanDisplayStatus(loan, now) }));
  const pick = (statuses: string[]): MaterialLoan[] =>
    withStatus.filter((entry) => statuses.includes(entry.status)).map((entry) => entry.loan);

  const current = pick(['ISSUED', 'RETURN_DUE', 'OVERDUE']);
  const upcoming = pick(['REQUESTED', 'RESERVED']).toSorted(
    (a, b) => a.startDate.getTime() - b.startDate.getTime(),
  );
  const openReturns = [
    ...pick(['RETURN_DUE']),
    ...pick(['ISSUED']).filter((loan) => loan.returnAnnouncedAt instanceof Date),
  ];
  const overdue = pick(['OVERDUE']).toSorted((a, b) => a.endDate.getTime() - b.endDate.getTime());
  const requestedCount = upcoming.filter((loan) => loan.status === 'REQUESTED').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={text.current[locale]} value={current.length} hint={text.out[locale]} />
        <StatTile
          label={text.upcoming[locale]}
          value={upcoming.length}
          hint={format(text.requested, locale, { n: requestedCount })}
          tone="blue"
        />
        <StatTile
          label={text.openReturns[locale]}
          value={openReturns.length}
          hint={text.dueSoon[locale]}
          tone="orange"
        />
        <StatTile
          label={text.overdue[locale]}
          value={overdue.length}
          hint={text.bringBack[locale]}
          tone="red"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/app/material/catalog"
          className="bg-conveniat-green flex h-14 items-center justify-center gap-2 rounded-2xl font-semibold text-white"
        >
          <PackageSearch className="size-5" aria-hidden />
          {text.findMaterial[locale]}
        </Link>
        <Link
          href="/app/material/scan"
          className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white font-semibold text-gray-800"
        >
          <ScanLine className="size-5" aria-hidden />
          {text.scan[locale]}
        </Link>
      </div>

      {me.data?.isMaterialTeam === false && (
        <Panel title={text.mine[locale]}>
          {holders.length === 0 ? (
            <EmptyState text={text.nothingOut[locale]} />
          ) : (
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              {holders.map((holder) => (
                <div key={holder.key}>
                  <div className="mb-1 flex items-center gap-1.5 font-bold text-gray-900">
                    {holder.icon === 'person' ? (
                      <User className="size-4" aria-hidden />
                    ) : (
                      <Building2 className="size-4" aria-hidden />
                    )}
                    {holder.key === 'me' ? text.withMe[locale] : holder.label}
                  </div>
                  <ul className="space-y-0.5 text-sm text-gray-700">
                    {[...holder.lines.values()].map((line) => (
                      <li key={line.name}>
                        <span className="font-semibold tabular-nums">{line.quantity} ×</span>{' '}
                        {line.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {overdue.length > 0 && (
        <LoanSection title={text.overdue[locale]} loans={overdue} onOpen={setOpenLoan} now={now} />
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <LoanSection title={text.current[locale]} loans={current} onOpen={setOpenLoan} now={now} />
        <LoanSection
          title={text.upcoming[locale]}
          loans={upcoming}
          onOpen={setOpenLoan}
          now={now}
        />
      </div>
      <LoanSection
        title={text.openReturns[locale]}
        loans={openReturns}
        onOpen={setOpenLoan}
        now={now}
      />

      {openLoan !== undefined && (
        <LoanDetailDialog
          loan={openLoan}
          isMaterialTeam={me.data?.isMaterialTeam ?? false}
          onClose={() => setOpenLoan(undefined)}
        />
      )}
    </div>
  );
};
