'use client';

import type { MaterialStockAlert } from '@/features/material/api/material-router';
import { holderName, positionCount, SectionTitle } from '@/features/material/components/counter-ui';
import { MaterialItemImage } from '@/features/material/components/material-item-image';
import {
  conditionLabel,
  format,
  formatDay,
  labels,
} from '@/features/material/components/material-labels';
import { MaterialQueryError } from '@/features/material/components/material-query-error';
import {
  EmptyState,
  focusRing,
  LoadingState,
  MaterialButton,
  Panel,
  StatTile,
} from '@/features/material/components/material-ui';
import {
  MATERIAL_POLL_INTERVAL_MS,
  materialQueryOptions,
  useDayEnd,
  useInvalidateMaterial,
  useMaterialLocale,
  useNow,
} from '@/features/material/hooks/use-material';
import { groupByHolder, holderOf, holderSearch } from '@/features/material/utils/holders';
import { itemPath } from '@/features/material/utils/scan';
import { trpc, type RouterOutputs } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  CornerDownLeft,
  PackageMinus,
  User,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

const text = {
  outToday: { de: 'Heute raus', en: 'Out today', fr: 'Sorties du jour' },
  backToday: { de: 'Heute zurück', en: 'Back today', fr: 'Retours du jour' },
  overdue: { de: 'Überfällig', en: 'Overdue', fr: 'En retard' },
  available: { de: 'Verfügbar', en: 'Available', fr: 'Disponible' },
  holders: {
    de: 'bei {n} Höfen/Personen',
    en: 'with {n} Hofs/people',
    fr: 'chez {n} Hofs/personnes',
  },
  articles: { de: '{n} Artikel', en: '{n} items', fr: '{n} articles' },
  handOut: { de: 'Ausgeben', en: 'Hand out', fr: 'Remettre' },
  takeBack: { de: 'Zurücknehmen', en: 'Take back', fr: 'Reprendre' },
  attention: {
    de: 'Braucht Aufmerksamkeit',
    en: 'Needs attention',
    fr: 'À traiter',
  },
  allClear: {
    de: 'Nichts offen. Alles im grünen Bereich.',
    en: 'Nothing open. All good.',
    fr: 'Rien en attente. Tout va bien.',
  },
  showAll: { de: 'Alle anzeigen ({n})', en: 'Show all ({n})', fr: 'Tout afficher ({n})' },
  pickUp: { de: 'Abholen', en: 'Pick up', fr: 'À retirer' },
  preparedFrom: {
    de: 'vorbereitet ab {day}',
    en: 'prepared from {day}',
    fr: 'préparé dès {day}',
  },
  resolve: { de: 'Erledigt', en: 'Done', fr: 'Traité' },
  lowStock: { de: 'Knapp', en: 'Low', fr: 'Bas' },
  lowStockLine: {
    de: 'noch {n} frei',
    en: '{n} left',
    fr: 'encore {n} libres',
  },
  noneFree: { de: 'keine mehr frei', en: 'none left', fr: 'plus aucun libre' },
  damagedLine: {
    de: '{n} beschädigt, warten auf Reparatur',
    en: '{n} damaged, waiting for repair',
    fr: '{n} endommagés, en attente de réparation',
  },
  inRepairLine: { de: '{n} in Reparatur', en: '{n} in repair', fr: '{n} en réparation' },
  overbookedLine: {
    de: 'Vorbereitungen überschneiden sich, es fehlen {n}',
    en: 'preparations overlap, {n} short',
    fr: 'préparations qui se chevauchent, il manque {n}',
  },
  repair: { de: 'Reparatur', en: 'Repair', fr: 'Réparation' },
  // participant
  ourHof: { de: 'Was unser Hof hat', en: 'What our Hof has', fr: 'Ce que notre Hof a' },
  withMe: { de: 'Bei mir', en: 'With me', fr: 'Chez moi' },
  participantIntro: {
    de: 'Material gibt es am Depot beim Materialteam. Hier siehst du, was dein Hof gerade hat und bis wann es zurück muss.',
    en: 'Material is handed out at the depot by the material team. Here you see what your Hof has and when it is due back.',
    fr: 'Le matériel se retire au dépôt auprès de l’équipe matériel. Ici, tu vois ce que ton Hof a et quand le rendre.',
  },
  nothingOut: {
    de: 'Gerade nichts ausgeliehen.',
    en: 'Nothing borrowed right now.',
    fr: 'Rien d’emprunté pour le moment.',
  },
  noHof: {
    de: 'Du bist keinem Hof zugeordnet und hast kein Material auf deinen Namen.',
    en: 'You belong to no Hof and have no material on your name.',
    fr: 'Tu n’es rattaché·e à aucun Hof et n’as pas de matériel à ton nom.',
  },
  until: { de: 'bis {day}', en: 'until {day}', fr: 'jusqu’au {day}' },
  readyFrom: {
    de: 'abholbereit ab {day}',
    en: 'ready for pickup from {day}',
    fr: 'à retirer dès {day}',
  },
} satisfies Record<string, StaticTranslationString>;

type Dashboard = RouterOutputs['material']['getDashboard'];

interface AttentionEntry {
  key: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: { label: string; tone: string };
  href: string;
  action?: React.ReactNode;
}

const ATTENTION_STEP = 8;

const iconTile = 'flex size-11 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5';

const stockAlertLine = (alert: MaterialStockAlert, locale: Locale): string => {
  switch (alert.kind) {
    case 'LOW_STOCK': {
      return alert.available === 0
        ? text.noneFree[locale]
        : format(text.lowStockLine, locale, { n: alert.available });
    }
    case 'DAMAGED': {
      return format(text.damagedLine, locale, { n: alert.quantity });
    }
    case 'IN_REPAIR': {
      return format(text.inRepairLine, locale, { n: alert.quantity });
    }
    default: {
      return format(text.overbookedLine, locale, { n: alert.missing });
    }
  }
};

/** Marks a damage report as dealt with, right from the list. */
const ResolveButton: React.FC<{ id: string }> = ({ id }) => {
  const locale = useMaterialLocale();
  const invalidate = useInvalidateMaterial();
  const resolve = trpc.material.resolveIncident.useMutation();
  return (
    <MaterialButton
      variant="secondary"
      loading={resolve.isPending}
      // stays off until the refetch removes the row; a second tap would only repeat it
      disabled={resolve.isSuccess}
      onClick={() =>
        resolve.mutate(
          { id },
          { onSuccess: () => void invalidate(), onError: (error) => toast.error(error.message) },
        )
      }
    >
      {text.resolve[locale]}
    </MaterialButton>
  );
};

/** Everything on the dashboard that wants a person, the most urgent first. */
const buildAttention = (data: Dashboard, locale: Locale): AttentionEntry[] => {
  const entries: AttentionEntry[] = [];
  for (const group of groupByHolder(data.overdue)) {
    for (const loan of group.loans) {
      entries.push({
        key: `overdue-${loan.id}`,
        icon: (
          <span className={cn(iconTile, 'bg-red-50 text-red-700')}>
            <AlertTriangle aria-hidden />
          </span>
        ),
        title: `${holderName(group, locale)} · ${loan.issuedQuantity ?? loan.quantity} × ${loan.item.name}`,
        subtitle: format(labels.overdueSince, locale, { day: formatDay(loan.endDate, locale) }),
        badge: { label: text.overdue[locale], tone: 'bg-red-600 text-white' },
        href: `/app/material/zurueck?${holderSearch(group.holder)}`,
      });
    }
  }
  for (const group of data.pickups) {
    const first = group.loans[0];
    entries.push({
      key: `pickup-${group.key}`,
      icon: (
        <span className={cn(iconTile, 'bg-blue-50 text-blue-700')}>
          <Clock aria-hidden />
        </span>
      ),
      title: `${holderName(group, locale)} · ${positionCount(group.loans.length, locale)}`,
      subtitle:
        first === undefined
          ? ''
          : format(text.preparedFrom, locale, { day: formatDay(first.startDate, locale) }),
      badge: {
        label: text.pickUp[locale],
        tone: 'bg-blue-50 text-blue-800 ring-1 ring-blue-600/30',
      },
      href: '/app/material/ausgeben',
    });
  }
  for (const incident of data.incidents) {
    entries.push({
      key: `incident-${incident.id}`,
      icon:
        incident.photoUrl === null ? (
          <span className={cn(iconTile, 'bg-amber-50 text-amber-700')}>
            <PackageMinus aria-hidden />
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- presigned bucket URL
          <img
            src={incident.photoUrl}
            alt=""
            className="size-11 shrink-0 rounded-xl object-cover"
          />
        ),
      title: `${incident.item.name} · ${incident.quantity} × ${conditionLabel[incident.condition][locale]}`,
      subtitle: [
        incident.note,
        incident.loan === null ? '' : `#${incident.loan.number}`,
        incident.reportedBy?.name ?? '',
      ]
        .filter((part) => part !== '')
        .join(' · '),
      href: itemPath(incident.item.code),
      action: <ResolveButton id={incident.id} />,
    });
  }
  for (const alert of data.stockAlerts) {
    const repair = alert.kind === 'DAMAGED' || alert.kind === 'IN_REPAIR';
    entries.push({
      key: `stock-${alert.kind}-${alert.itemCode}`,
      icon: (
        <span className={cn(iconTile, 'bg-gray-100 text-gray-700')}>
          {repair ? <Wrench aria-hidden /> : <PackageMinus aria-hidden />}
        </span>
      ),
      title: alert.itemName,
      subtitle: stockAlertLine(alert, locale),
      badge: repair
        ? {
            label: text.repair[locale],
            tone: 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/30',
          }
        : {
            label: text.lowStock[locale],
            tone: 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/30',
          },
      href: itemPath(alert.itemCode),
    });
  }
  return entries;
};

const AttentionRow: React.FC<{ entry: AttentionEntry }> = ({ entry }) => (
  <li className="flex items-center gap-2 pr-3">
    <Link
      href={entry.href}
      className={cn(
        'flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 hover:bg-gray-50',
        focusRing,
        'focus-visible:ring-inset',
      )}
    >
      {entry.icon}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 font-semibold text-gray-900" title={entry.title}>
          {entry.title}
        </span>
        {entry.subtitle !== '' && (
          <span className="block truncate text-sm text-gray-500" title={entry.subtitle}>
            {entry.subtitle}
          </span>
        )}
      </span>
      {entry.badge !== undefined && (
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
            entry.badge.tone,
          )}
        >
          {entry.badge.label}
        </span>
      )}
    </Link>
    {entry.action}
  </li>
);

const TeamOverview: React.FC = () => {
  const locale = useMaterialLocale();
  const dayEnd = useDayEnd();
  const [shown, setShown] = useState(ATTENTION_STEP);
  const dashboard = trpc.material.getDashboard.useQuery(
    { dayEnd },
    {
      ...materialQueryOptions,
      refetchInterval: MATERIAL_POLL_INTERVAL_MS,
      // the incident photo links expire after an hour, a restored copy would show broken images
      meta: { persist: false },
    },
  );

  if (dashboard.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!dashboard.data) return <MaterialQueryError error={dashboard.error} />;
  const data = dashboard.data;
  const attention = buildAttention(data, locale);
  const pickupLines = data.pickups.reduce((sum, group) => sum + group.loans.length, 0);
  const overdueHolders = new Set(
    data.overdue.map((loan) => {
      const holder = holderOf(loan);
      return holder === undefined ? loan.id : `${holder.kind}:${holder.id}`;
    }),
  ).size;
  const bigButton =
    'flex h-14 items-center justify-center gap-2 rounded-2xl text-base font-semibold [&_svg]:size-5';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={text.outToday[locale]}
          value={data.pickups.length}
          hint={positionCount(pickupLines, locale)}
        />
        <StatTile
          label={text.backToday[locale]}
          value={data.dueToday.holders}
          hint={positionCount(data.dueToday.lines, locale)}
        />
        <StatTile
          label={text.overdue[locale]}
          value={data.overdue.length}
          hint={format(text.holders, locale, { n: overdueHolders })}
          tone={data.overdue.length > 0 ? 'red' : 'default'}
        />
        <StatTile
          label={text.available[locale]}
          value={data.available.toLocaleString(`${locale}-CH`)}
          hint={format(text.articles, locale, { n: data.articles })}
          tone="green"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/app/material/ausgeben"
          className={cn(bigButton, 'bg-conveniat-green text-white', focusRing)}
        >
          <ArrowUpRight aria-hidden />
          {text.handOut[locale]}
        </Link>
        <Link
          href="/app/material/zurueck"
          className={cn(bigButton, 'border border-gray-300 bg-white text-gray-900', focusRing)}
        >
          <CornerDownLeft aria-hidden />
          {text.takeBack[locale]}
        </Link>
      </div>

      <Panel>
        <div className="px-4 pt-4">
          <SectionTitle count={attention.length}>{text.attention[locale]}</SectionTitle>
        </div>
        {attention.length === 0 ? (
          <EmptyState text={text.allClear[locale]} />
        ) : (
          <ul className="divide-y divide-gray-100">
            {attention.slice(0, shown).map((entry) => (
              <AttentionRow key={entry.key} entry={entry} />
            ))}
          </ul>
        )}
        {attention.length > shown && (
          <div className="border-t border-gray-100 p-3">
            <MaterialButton
              variant="secondary"
              className="w-full"
              onClick={() => setShown(attention.length)}
            >
              {format(text.showAll, locale, { n: attention.length })}
            </MaterialButton>
          </div>
        )}
      </Panel>
    </div>
  );
};

type MyLoan = RouterOutputs['material']['getMyHofLoans']['mine'][number];

/** One holder's card for a participant: what is out and until when, overdue in red. */
const MyLoansCard: React.FC<{ title: string; icon?: React.ReactNode; loans: MyLoan[] }> = ({
  title,
  icon,
  loans,
}) => {
  const locale = useMaterialLocale();
  const now = useNow();
  return (
    <Panel>
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        {icon}
        <h2 className="min-w-0 truncate font-bold text-gray-900">{title}</h2>
      </div>
      {loans.length === 0 ? (
        <EmptyState text={text.nothingOut[locale]} />
      ) : (
        <ul className="divide-y divide-gray-100">
          {loans.map((loan) => {
            const prepared = loan.status === 'RESERVED';
            const overdue = !prepared && loan.endDate < now;
            let when = format(text.until, locale, { day: formatDay(loan.endDate, locale) });
            if (prepared) {
              when = format(text.readyFrom, locale, { day: formatDay(loan.startDate, locale) });
            } else if (overdue) {
              when = format(labels.overdueSince, locale, { day: formatDay(loan.endDate, locale) });
            }
            return (
              <li
                key={loan.id}
                className={cn('flex items-center gap-3 px-4 py-3', overdue && 'bg-red-50')}
              >
                <MaterialItemImage
                  name={loan.item.name}
                  imageUrl={loan.item.imageUrl}
                  className="size-11"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-gray-900">
                    <span className="tabular-nums">{loan.issuedQuantity ?? loan.quantity} ×</span>{' '}
                    {loan.item.name}
                  </div>
                  <div
                    className={cn(
                      'truncate text-sm',
                      overdue && 'font-semibold text-red-700',
                      prepared && 'text-blue-700',
                      !overdue && !prepared && 'text-gray-500',
                    )}
                  >
                    {when}
                  </div>
                </div>
                {overdue && (
                  <span className="shrink-0 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
                    {labels.overdue[locale]}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
};

/** A participant's only screen: read-only cards of what their Höfe and they have. */
const MyHofOverview: React.FC = () => {
  const locale = useMaterialLocale();
  const loans = trpc.material.getMyHofLoans.useQuery(undefined, {
    ...materialQueryOptions,
    refetchInterval: MATERIAL_POLL_INTERVAL_MS,
  });
  if (loans.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!loans.data) return <MaterialQueryError error={loans.error} />;
  const { hoefe, mine } = loans.data;

  return (
    <div className="space-y-4">
      <p className="px-1 text-sm text-gray-600">{text.participantIntro[locale]}</p>
      {hoefe.map((hof) => (
        <MyLoansCard
          key={hof.id}
          title={`${text.ourHof[locale]} · ${hof.name}`}
          loans={hof.loans}
        />
      ))}
      {mine.length > 0 && (
        <MyLoansCard
          title={text.withMe[locale]}
          icon={<User className="size-4 shrink-0 text-gray-500" aria-hidden />}
          loans={mine}
        />
      )}
      {hoefe.length === 0 && mine.length === 0 && (
        <Panel>
          <EmptyState text={text.noHof[locale]} />
        </Panel>
      )}
    </div>
  );
};

/** The depot's start page: the counter's day for the material team, the Hof card for others. */
export const OverviewView: React.FC = () => {
  const locale = useMaterialLocale();
  const me = trpc.material.getMe.useQuery(undefined, materialQueryOptions);
  if (me.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!me.data) return <MaterialQueryError error={me.error} />;
  return me.data.isMaterialTeam ? <TeamOverview /> : <MyHofOverview />;
};
