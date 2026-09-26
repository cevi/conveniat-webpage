'use client';

import { LoanCard, loanQuantity } from '@/features/material/components/loan-card';
import { LoanDetailDialog } from '@/features/material/components/loan-detail-dialog';
import { labels } from '@/features/material/components/material-labels';
import { MaterialQueryError } from '@/features/material/components/material-query-error';
import { EmptyState, LoadingState, Panel } from '@/features/material/components/material-ui';
import {
  materialQueryOptions,
  useMaterialLocale,
  useNow,
  type MaterialLoan,
} from '@/features/material/hooks/use-material';
import { trpc } from '@/trpc/client';
import type { StaticTranslationString } from '@/types/types';
import { Building2, ChevronDown, User } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

const text = {
  mine: { de: 'Mein Hof', en: 'My Hof', fr: 'Mon Hof' },
  noHoefe: {
    de: 'Du bist über deine Anmeldung keinem Hof zugeordnet. Das Materialteam sieht hier alle Höfe.',
    en: 'Your registration does not link you to a Hof. The material team sees all Hofs here.',
    fr: 'Ton inscription ne te rattache à aucun Hof. L’équipe matériel voit ici tous les Hofs.',
  },
} satisfies Record<string, StaticTranslationString>;

/** "10 × Wolldecke, 2 × Handbeil": what a holder has, summed per article. */
const summarise = (loans: MaterialLoan[]): string => {
  const lines = new Map<string, number>();
  for (const loan of loans) {
    if (loan.status !== 'ISSUED') continue;
    lines.set(loan.item.name, (lines.get(loan.item.name) ?? 0) + loanQuantity(loan));
  }
  return [...lines.entries()].map(([name, quantity]) => `${quantity} × ${name}`).join(', ');
};

const HolderPanel: React.FC<{
  icon: 'hof' | 'person';
  title: string;
  loans: MaterialLoan[];
  onOpen: (loan: MaterialLoan) => void;
  now: Date;
  badge?: string;
}> = ({ icon, title, loans, onOpen, now, badge }) => {
  const locale = useMaterialLocale();
  const [open, setOpen] = useState(false);
  const Icon = icon === 'person' ? User : Building2;
  const summary = summarise(loans);

  return (
    <Panel>
      <button
        type="button"
        className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon className="mt-0.5 size-5 shrink-0 text-gray-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <span className="min-w-0 truncate" title={title}>
              {title}
            </span>
            {badge !== undefined && (
              <span className="bg-conveniat-green/10 text-conveniat-green shrink-0 rounded-full px-2 py-0.5 text-xs">
                {badge}
              </span>
            )}
          </div>
          <div className="mt-1 text-sm text-gray-700">{summary === '' ? '–' : summary}</div>
        </div>
        <span className="text-xs font-semibold text-gray-500 tabular-nums">{loans.length}</span>
        <ChevronDown
          className={open ? 'size-4 rotate-180 text-gray-400' : 'size-4 text-gray-400'}
          aria-hidden
        />
      </button>
      {open && (
        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {loans.length === 0 && <EmptyState text={labels.empty[locale]} />}
          {loans.map((loan) => (
            <li key={loan.id}>
              <LoanCard loan={loan} locale={locale} now={now} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};

/** Höfe with what each has out and reserved (§4 of the spec, variant A). */
export const HoefeView: React.FC = () => {
  const locale = useMaterialLocale();
  const now = useNow();
  const hoefe = trpc.material.getHofList.useQuery(undefined, materialQueryOptions);
  const me = trpc.material.getMe.useQuery(undefined, materialQueryOptions);
  const [openLoan, setOpenLoan] = useState<MaterialLoan | undefined>();

  if (hoefe.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!hoefe.data) return <MaterialQueryError error={hoefe.error} />;

  const isMaterialTeam = me.data?.isMaterialTeam ?? false;
  const shown = hoefe.data.filter((hof) => isMaterialTeam || hof.isMine);

  return (
    <div className="space-y-3">
      {shown.length === 0 && <EmptyState text={text.noHoefe[locale]} />}
      {shown.map((hof) => (
        <HolderPanel
          key={hof.id}
          icon="hof"
          title={hof.name}
          {...(hof.isMine ? { badge: text.mine[locale] } : {})}
          loans={hof.loans}
          onOpen={setOpenLoan}
          now={now}
        />
      ))}
      {openLoan !== undefined && (
        <LoanDetailDialog
          loan={openLoan}
          isMaterialTeam={isMaterialTeam}
          onClose={() => setOpenLoan(undefined)}
        />
      )}
    </div>
  );
};

/** People who have material booked on themselves (§4 of the spec, variant B). */
export const PeopleView: React.FC = () => {
  const locale = useMaterialLocale();
  const now = useNow();
  const people = trpc.material.getPersonList.useQuery(undefined, materialQueryOptions);
  const [openLoan, setOpenLoan] = useState<MaterialLoan | undefined>();

  if (people.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!people.data) return <MaterialQueryError error={people.error} />;

  return (
    <div className="space-y-3">
      {people.data.length === 0 && <EmptyState text={labels.empty[locale]} />}
      {people.data.map((person) => (
        <HolderPanel
          key={person.uuid}
          icon="person"
          title={person.name}
          loans={person.loans}
          onOpen={setOpenLoan}
          now={now}
        />
      ))}
      {openLoan !== undefined && (
        <LoanDetailDialog loan={openLoan} isMaterialTeam onClose={() => setOpenLoan(undefined)} />
      )}
    </div>
  );
};
