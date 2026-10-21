'use client';

import { buttonVariants } from '@/components/ui/buttons/button';
import { IconTile } from '@/components/ui/icon-tile';
import type { MaterialStockAlert } from '@/features/material/api/material-router';
import { holderName, loanSummary, positionCount } from '@/features/material/components/counter-ui';
import {
  conditionLabel,
  format,
  formatDay,
  labels,
} from '@/features/material/components/material-labels';
import { MaterialQueryError } from '@/features/material/components/material-query-error';
import { chip, chipTone } from '@/features/material/components/material-status-badge';
import {
  EmptyState,
  focusRing,
  LoadingState,
  MaterialButton,
  Panel,
  StatTile,
} from '@/features/material/components/material-ui';
import { MyLoansView } from '@/features/material/components/my-loans-view';
import {
  MATERIAL_POLL_INTERVAL_MS,
  materialQueryOptions,
  useDayEnd,
  useInvalidateMaterial,
  useMaterialLocale,
} from '@/features/material/hooks/use-material';
import {
  groupByHolder,
  holderOf,
  holderSearch,
  isAnnounced,
} from '@/features/material/utils/holders';
import { itemPath } from '@/features/material/utils/scan';
import { trpc, type RouterOutputs } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  CornerDownLeft,
  Inbox,
  PackageMinus,
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
    en: 'with {n} Höfe/people',
    fr: 'chez {n} Höfe/personnes',
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
  request: { de: 'Anfrage', en: 'Request', fr: 'Demande' },
  requestedFor: {
    de: 'angefragt für {day}',
    en: 'requested for {day}',
    fr: 'demandé pour {day}',
  },
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
      variant="outlined"
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
  for (const group of data.requests) {
    const first = group.loans[0];
    entries.push({
      key: `request-${group.key}`,
      icon: <IconTile icon={Inbox} />,
      title: `${holderName(group, locale)} · ${positionCount(group.loans.length, locale)}`,
      subtitle:
        first === undefined
          ? ''
          : format(text.requestedFor, locale, { day: formatDay(first.startDate, locale) }),
      badge: {
        label: text.request[locale],
        tone: chipTone.neutral,
      },
      href: '/app/material/ausgeben',
    });
  }
  for (const group of data.announced) {
    entries.push({
      key: `announced-${group.key}`,
      icon: <IconTile icon={CornerDownLeft} />,
      title: holderName(group, locale),
      subtitle: loanSummary(group.loans.filter((loan) => isAnnounced(loan))),
      badge: {
        label: labels.returnAnnounced[locale],
        tone: chipTone.ready,
      },
      href: `/app/material/zurueck?${holderSearch(group.holder)}`,
    });
  }
  for (const group of groupByHolder(data.overdue)) {
    for (const loan of group.loans) {
      entries.push({
        key: `overdue-${loan.id}`,
        icon: <IconTile icon={AlertTriangle} className="bg-live-soft text-live" />,
        title: `${holderName(group, locale)} · ${loan.issuedQuantity ?? loan.quantity} × ${loan.item.name}`,
        subtitle: format(labels.overdueSince, locale, { day: formatDay(loan.endDate, locale) }),
        badge: { label: text.overdue[locale], tone: chipTone.overdue },
        href: `/app/material/zurueck?${holderSearch(group.holder)}`,
      });
    }
  }
  for (const group of data.pickups) {
    const first = group.loans[0];
    entries.push({
      key: `pickup-${group.key}`,
      icon: <IconTile icon={Clock} />,
      title: `${holderName(group, locale)} · ${positionCount(group.loans.length, locale)}`,
      subtitle:
        first === undefined
          ? ''
          : format(text.preparedFrom, locale, { day: formatDay(first.startDate, locale) }),
      badge: {
        label: text.pickUp[locale],
        tone: chipTone.neutral,
      },
      href: '/app/material/ausgeben',
    });
  }
  for (const incident of data.incidents) {
    entries.push({
      key: `incident-${incident.id}`,
      icon:
        incident.photoUrl === null ? (
          <IconTile icon={PackageMinus} className="bg-live-soft text-live" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- presigned bucket URL
          <img
            src={incident.photoUrl}
            alt=""
            className="size-[38px] shrink-0 rounded-[10px] object-cover"
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
      icon: <IconTile icon={repair ? Wrench : PackageMinus} />,
      title: alert.itemName,
      subtitle: stockAlertLine(alert, locale),
      badge: repair
        ? {
            label: text.repair[locale],
            tone: chipTone.warning,
          }
        : {
            label: text.lowStock[locale],
            tone: chipTone.warning,
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
        'hover:bg-quiet flex min-w-0 flex-1 items-center gap-3 py-3 pl-4',
        focusRing,
        'focus-visible:ring-inset',
      )}
    >
      {entry.icon}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 font-semibold text-green-900" title={entry.title}>
          {entry.title}
        </span>
        {entry.subtitle !== '' && (
          <span className="block truncate text-sm text-green-700" title={entry.subtitle}>
            {entry.subtitle}
          </span>
        )}
      </span>
      {entry.badge !== undefined && (
        <span className={cn(chip, entry.badge.tone)}>{entry.badge.label}</span>
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
          tone={data.overdue.length > 0 ? 'live' : 'default'}
        />
        <StatTile
          label={text.available[locale]}
          value={data.available.toLocaleString(`${locale}-CH`)}
          hint={format(text.articles, locale, { n: data.articles })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/app/material/ausgeben"
          className={cn(buttonVariants({ variant: 'primary', size: 'touch' }), focusRing)}
        >
          <ArrowUpRight aria-hidden />
          {text.handOut[locale]}
          {data.requests.length > 0 && (
            <span className={cn(chip, 'bg-white text-green-900 tabular-nums')}>
              {data.requests.length}
            </span>
          )}
        </Link>
        <Link
          href="/app/material/zurueck"
          className={cn(buttonVariants({ variant: 'outlined', size: 'touch' }), focusRing)}
        >
          <CornerDownLeft aria-hidden />
          {text.takeBack[locale]}
        </Link>
      </div>

      <Panel title={text.attention[locale]} count={attention.length}>
        {attention.length === 0 ? (
          <EmptyState text={text.allClear[locale]} />
        ) : (
          <ul className="divide-line divide-y">
            {attention.slice(0, shown).map((entry) => (
              <AttentionRow key={entry.key} entry={entry} />
            ))}
          </ul>
        )}
        {attention.length > shown && (
          <div className="border-line border-t p-3">
            <MaterialButton
              variant="outlined"
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

/** The depot's start page: the counter's day for the material team, their own overview for others. */
export const OverviewView: React.FC = () => {
  const locale = useMaterialLocale();
  const me = trpc.material.getMe.useQuery(undefined, materialQueryOptions);
  if (me.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!me.data) return <MaterialQueryError error={me.error} />;
  return me.data.isMaterialTeam ? <TeamOverview /> : <MyLoansView />;
};
