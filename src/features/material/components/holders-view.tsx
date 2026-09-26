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
  contact: {
    de: 'Materialverantwortlich: {name}',
    en: 'Material contact: {name}',
    fr: 'Responsable matériel : {name}',
  },
  mine: { de: 'Meine Abteilung', en: 'My department', fr: 'Mon groupe' },
  noDepartments: {
    de: 'Du bist keiner Abteilung zugeordnet. Das Materialteam sieht hier alle Abteilungen.',
    en: 'You do not belong to a department. The material team sees all departments here.',
    fr: 'Tu n’es rattaché·e à aucun groupe. L’équipe matériel voit ici tous les groupes.',
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
  icon: 'department' | 'person';
  title: string;
  subtitle?: string;
  loans: MaterialLoan[];
  onOpen: (loan: MaterialLoan) => void;
  now: Date;
  badge?: string;
}> = ({ icon, title, subtitle, loans, onOpen, now, badge }) => {
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
            {title}
            {badge !== undefined && (
              <span className="bg-conveniat-green/10 text-conveniat-green rounded-full px-2 py-0.5 text-xs">
                {badge}
              </span>
            )}
          </div>
          {subtitle !== undefined && <div className="text-xs text-gray-500">{subtitle}</div>}
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

/** Departments with what each has out and reserved (§4 of the spec, variant A). */
export const DepartmentsView: React.FC = () => {
  const locale = useMaterialLocale();
  const now = useNow();
  const departments = trpc.material.getDepartmentList.useQuery(undefined, materialQueryOptions);
  const me = trpc.material.getMe.useQuery(undefined, materialQueryOptions);
  const [openLoan, setOpenLoan] = useState<MaterialLoan | undefined>();

  if (departments.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!departments.data) return <MaterialQueryError error={departments.error} />;

  const isMaterialTeam = me.data?.isMaterialTeam ?? false;
  const shown = departments.data.filter((department) => isMaterialTeam || department.isMine);

  return (
    <div className="space-y-3">
      {shown.length === 0 && <EmptyState text={text.noDepartments[locale]} />}
      {shown.map((department) => (
        <HolderPanel
          key={department.id}
          icon="department"
          title={`${department.shortName} · ${department.name}`}
          {...(department.contactName === null
            ? {}
            : { subtitle: text.contact[locale].replace('{name}', department.contactName) })}
          {...(department.isMine ? { badge: text.mine[locale] } : {})}
          loans={department.loans}
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
