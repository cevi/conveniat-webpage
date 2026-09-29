'use client';

import { HolderAvatar, holderName, SectionTitle } from '@/features/material/components/counter-ui';
import { IncidentPhotoField } from '@/features/material/components/incident-photo-field';
import { ItemEditDialog } from '@/features/material/components/item-edit-dialog';
import { ItemHeader, ItemTexts } from '@/features/material/components/item-sections';
import {
  conditionLabel,
  format,
  formatDay,
  labels,
} from '@/features/material/components/material-labels';
import { MaterialQrCode } from '@/features/material/components/material-qr-code';
import { MaterialQueryError } from '@/features/material/components/material-query-error';
import { MaterialStockBar, stockTone } from '@/features/material/components/material-stock-bar';
import {
  EmptyState,
  Field,
  focusRing,
  inputClass,
  LoadingState,
  MaterialButton,
  MaterialSheet,
  NumberInput,
  Panel,
  SheetFooter,
} from '@/features/material/components/material-ui';
import { useIncidentPhotoUpload } from '@/features/material/hooks/use-incident-photo-upload';
import {
  materialQueryOptions,
  useInvalidateMaterial,
  useMaterialLocale,
  useNow,
  type MaterialItemDetail,
} from '@/features/material/hooks/use-material';
import { orderStepOf } from '@/features/material/utils/basket';
import { groupByHolder, holderSearch } from '@/features/material/utils/holders';
import { itemPath } from '@/features/material/utils/scan';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { AlertTriangle, ArrowLeft, ChevronRight, Pencil, QrCode, Wrench } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

const text = {
  back: { de: 'Zum Inventar', en: 'To the inventory', fr: 'Vers l’inventaire' },
  whereIsIt: { de: 'Wo ist es gerade', en: 'Where it is now', fr: 'Où il se trouve' },
  allHome: {
    de: 'Alles im Depot, nichts vorbereitet.',
    en: 'All in the depot, nothing prepared.',
    fr: 'Tout au dépôt, rien de préparé.',
  },
  outLine: {
    de: '{n} draussen · fällig {day}',
    en: '{n} out · due {day}',
    fr: '{n} dehors · dû {day}',
  },
  preparedLine: {
    de: '{n} vorbereitet · ab {day}',
    en: '{n} prepared · from {day}',
    fr: '{n} préparés · dès {day}',
  },
  requestedLine: {
    de: '{n} angefragt · ab {day}',
    en: '{n} requested · from {day}',
    fr: '{n} demandés · dès {day}',
  },
  repair: { de: 'Reparatur', en: 'Repair', fr: 'Réparation' },
  startRepair: {
    de: 'Beschädigte in Reparatur geben',
    en: 'Send damaged to repair',
    fr: 'Envoyer en réparation',
  },
  finishRepair: { de: 'Reparatur abgeschlossen', en: 'Repair finished', fr: 'Réparation terminée' },
  writeOff: { de: 'Beschädigte ausbuchen', en: 'Write off damaged', fr: 'Sortir les endommagés' },
  notRepairable: { de: 'Nicht reparierbar', en: 'Beyond repair', fr: 'Irréparable' },
  qrCaption: { de: '{name} · {code}', en: '{name} · {code}', fr: '{name} · {code}' },
  condition: { de: 'Was ist los?', en: 'What is wrong?', fr: 'Quel est le problème ?' },
  whatHappened: { de: 'Was ist passiert?', en: 'What happened?', fr: 'Que s’est-il passé ?' },
  reportHint: {
    de: 'Nur für Stück im Depot. Was draussen ist, wird bei der Rücknahme erfasst.',
    en: 'Only for pieces in the depot. What is out is recorded at the take-back.',
    fr: 'Seulement pour les pièces au dépôt. Ce qui est dehors se saisit au retour.',
  },
  damage: { de: 'Schaden', en: 'Damage', fr: 'Dégât' },
  reported: { de: 'Schaden gemeldet.', en: 'Damage reported.', fr: 'Dégât signalé.' },
} satisfies Record<string, StaticTranslationString>;

type StockAction = 'START_REPAIR' | 'FINISH_REPAIR' | 'WRITE_OFF_DAMAGED' | 'MARK_REPAIRED_DAMAGED';

const stockActionLabel: Record<StockAction, StaticTranslationString> = {
  START_REPAIR: text.startRepair,
  FINISH_REPAIR: text.finishRepair,
  WRITE_OFF_DAMAGED: text.writeOff,
  MARK_REPAIRED_DAMAGED: text.notRepairable,
};

const REPORT_CONDITIONS = ['DAMAGED', 'LIGHT_DAMAGE', 'MISSING'] as const;
type ReportCondition = (typeof REPORT_CONDITIONS)[number];

/** Repair workflow: damaged pieces go to repair, come back, or leave the stock. */
const StockActions: React.FC<{ itemId: string; damaged: number; inRepair: number }> = ({
  itemId,
  damaged,
  inRepair,
}) => {
  const locale = useMaterialLocale();
  const invalidate = useInvalidateMaterial();
  const adjust = trpc.material.adjustItemStock.useMutation();
  const [quantity, setQuantity] = useState(1);

  // a step with nothing to act on is left out rather than shown switched off
  const actions = (
    [
      ['START_REPAIR', damaged],
      ['WRITE_OFF_DAMAGED', damaged],
      ['FINISH_REPAIR', inRepair],
      ['MARK_REPAIRED_DAMAGED', inRepair],
    ] satisfies [StockAction, number][]
  ).filter(([, source]) => source > 0);

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600" aria-hidden>
          {labels.quantity[locale]}
        </span>
        <NumberInput
          aria-label={labels.quantity[locale]}
          min={1}
          max={Math.max(damaged, inRepair, 1)}
          className="w-24"
          value={quantity}
          onChange={setQuantity}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {actions.map(([action, source]) => (
          <MaterialButton
            key={action}
            variant="secondary"
            disabled={source < quantity}
            loading={adjust.isPending && adjust.variables.action === action}
            onClick={() =>
              adjust.mutate(
                { id: itemId, action, quantity },
                {
                  onSuccess: () => {
                    toast.success(labels.saved[locale]);
                    void invalidate();
                  },
                  onError: (error) => toast.error(error.message),
                },
              )
            }
          >
            {stockActionLabel[action][locale]} ({source})
          </MaterialButton>
        ))}
      </div>
    </div>
  );
};

/** Damage or a loss noticed on the shelf; the pieces move out of the stock right away. */
const ReportDamageForm: React.FC<{
  itemId: string;
  maxQuantity: number;
  onDone: () => void;
  locale: Locale;
}> = ({ itemId, maxQuantity, onDone, locale }) => {
  const [condition, setCondition] = useState<ReportCondition>('DAMAGED');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const photo = useIncidentPhotoUpload();
  const report = trpc.material.reportIncident.useMutation();

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{text.reportHint[locale]}</p>
      <Field as="group" label={text.condition[locale]}>
        <div role="radiogroup" className="grid grid-cols-3 gap-2">
          {REPORT_CONDITIONS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={condition === option}
              onClick={() => setCondition(option)}
              className={cn(
                'min-h-11 cursor-pointer rounded-lg border-2 px-1 py-1 text-sm leading-tight font-semibold break-words hyphens-auto',
                focusRing,
                condition === option
                  ? 'border-conveniat-green bg-conveniat-green/10 text-gray-900'
                  : 'border-gray-200 text-gray-700',
              )}
            >
              {conditionLabel[option][locale]}
            </button>
          ))}
        </div>
      </Field>
      <Field label={labels.quantity[locale]}>
        <NumberInput
          min={1}
          max={Math.max(maxQuantity, 1)}
          value={quantity}
          onChange={setQuantity}
        />
      </Field>
      <Field label={text.whatHappened[locale]}>
        <textarea
          className={cn(inputClass, 'h-24 py-2')}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      <IncidentPhotoField upload={photo} />
      <SheetFooter>
        <MaterialButton
          className="w-full"
          variant="danger"
          loading={report.isPending || photo.isUploading}
          disabled={note.trim() === ''}
          onClick={() =>
            report.mutate(
              {
                itemId,
                condition,
                quantity,
                note,
                ...(photo.photoKey === undefined ? {} : { photoKey: photo.photoKey }),
              },
              {
                onSuccess: () => {
                  toast.success(text.reported[locale]);
                  onDone();
                },
                onError: (error) => toast.error(error.message),
              },
            )
          }
        >
          <AlertTriangle aria-hidden />
          {labels.reportDamage[locale]}
        </MaterialButton>
      </SheetFooter>
    </div>
  );
};

/** Who has the article, by holder; a holder with pieces out opens their take-back. */
const WhereIsIt: React.FC<{ item: MaterialItemDetail }> = ({ item }) => {
  const locale = useMaterialLocale();
  const now = useNow();
  const groups = groupByHolder(item.openLoans);
  return (
    <Panel>
      <div className="px-4 pt-4">
        <SectionTitle count={groups.length}>{text.whereIsIt[locale]}</SectionTitle>
      </div>
      {groups.length === 0 ? (
        <EmptyState text={text.allHome[locale]} />
      ) : (
        <ul className="divide-y divide-gray-100">
          {groups.map((group) => {
            const name = holderName(group, locale);
            const out = group.loans.filter((loan) => loan.status === 'ISSUED');
            const prepared = group.loans.filter((loan) => loan.status === 'RESERVED');
            const requested = group.loans.filter((loan) => loan.status === 'REQUESTED');
            const overdue = out.some((loan) => loan.endDate < now);
            const lines = [
              ...(out.length > 0
                ? [
                    format(text.outLine, locale, {
                      n: out.reduce((sum, loan) => sum + (loan.issuedQuantity ?? loan.quantity), 0),
                      day: formatDay(out[0]?.endDate ?? now, locale),
                    }),
                  ]
                : []),
              ...(prepared.length > 0
                ? [
                    format(text.preparedLine, locale, {
                      n: prepared.reduce((sum, loan) => sum + loan.quantity, 0),
                      day: formatDay(prepared[0]?.startDate ?? now, locale),
                    }),
                  ]
                : []),
              ...(requested.length > 0
                ? [
                    format(text.requestedLine, locale, {
                      n: requested.reduce((sum, loan) => sum + loan.quantity, 0),
                      day: formatDay(requested[0]?.startDate ?? now, locale),
                    }),
                  ]
                : []),
            ];
            const content = (
              <>
                <HolderAvatar name={name} alert={overdue} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-gray-900">{name}</span>
                  {lines.map((line) => (
                    <span
                      key={line}
                      className={cn(
                        'block truncate text-sm',
                        overdue ? 'text-red-700' : 'text-gray-500',
                      )}
                    >
                      {line}
                    </span>
                  ))}
                </span>
              </>
            );
            return (
              <li key={group.key}>
                {out.length > 0 ? (
                  <Link
                    href={`/app/material/zurueck?${holderSearch(group.holder)}`}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 hover:bg-gray-50',
                      focusRing,
                      'focus-visible:ring-inset',
                    )}
                  >
                    {content}
                    <ChevronRight className="size-4 shrink-0 text-gray-400" aria-hidden />
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
};

/** One article in full: its numbers, where its pieces are, and what the team can do with it. */
export const ItemDetailView: React.FC<{ code: string }> = ({ code }) => {
  const locale = useMaterialLocale();
  const item = trpc.material.getItem.useQuery({ code }, materialQueryOptions);
  const invalidate = useInvalidateMaterial();
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (item.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!item.data) return <MaterialQueryError error={item.error} />;
  const data = item.data;

  // the dot ties a figure to its part of the bar below; the unit is said once, under the bar
  const numbers: [string, number, string | undefined][] = [
    [labels.available[locale], data.stock.available, stockTone.free],
    [labels.reserved[locale], data.stock.reserved, stockTone.reserved],
    [labels.issued[locale], data.stock.issued, stockTone.issued],
    [labels.damaged[locale], data.damagedQuantity, stockTone.broken],
    [labels.inRepair[locale], data.inRepairQuantity, stockTone.broken],
    [labels.maxPerLoan[locale], data.maxLoanQuantity, undefined],
    ...(orderStepOf(data.orderStep) > 1
      ? [[labels.orderStep[locale], data.orderStep, undefined] as [string, number, undefined]]
      : []),
  ];

  return (
    <div className="space-y-4">
      <Link
        href="/app/material/inventar"
        className={cn(
          'inline-flex min-h-11 items-center gap-1 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-900',
          focusRing,
        )}
      >
        <ArrowLeft className="size-4" aria-hidden />
        {text.back[locale]}
      </Link>

      <ItemHeader item={data} locale={locale} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Panel>
            <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-t-2xl bg-gray-100">
              {numbers.map(([label, value, tone]) => (
                <div key={label} className="min-w-0 bg-white px-3 py-2.5 sm:px-4 sm:py-3">
                  <dt className="flex items-start gap-1.5 text-xs leading-tight text-gray-500">
                    {tone !== undefined && (
                      <span
                        className={cn('mt-1 size-1.5 shrink-0 rounded-full', tone)}
                        aria-hidden
                      />
                    )}
                    <span className="break-words hyphens-auto">{label}</span>
                  </dt>
                  {/* a zero is worth knowing, not worth looking at */}
                  <dd
                    className={cn(
                      'mt-0.5 text-xl font-semibold tabular-nums',
                      value === 0 ? 'text-gray-300' : 'text-gray-900',
                    )}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="p-4">
              <MaterialStockBar
                stock={data.stock}
                totalQuantity={data.totalQuantity}
                unavailable={data.damagedQuantity + data.inRepairQuantity}
                unit={data.unit}
                locale={locale}
                size="lg"
                // the tiles above already name every part
                breakdown={false}
              />
            </div>
          </Panel>
          <div className="grid grid-cols-3 gap-2 [&>button]:min-w-0 [&>button]:px-2">
            <MaterialButton variant="secondary" onClick={() => setEditing(true)}>
              <Pencil aria-hidden />
              {labels.edit[locale]}
            </MaterialButton>
            <MaterialButton variant="secondary" onClick={() => setShowQr(true)}>
              <QrCode aria-hidden />
              QR
            </MaterialButton>
            <MaterialButton variant="danger" onClick={() => setReporting(true)}>
              <AlertTriangle aria-hidden />
              <span className="truncate">{text.damage[locale]}</span>
            </MaterialButton>
          </div>
        </div>
        <WhereIsIt item={data} />
        {(data.damagedQuantity > 0 || data.inRepairQuantity > 0) && (
          <Panel
            title={text.repair[locale]}
            action={<Wrench className="size-4 text-gray-400" aria-hidden />}
          >
            <StockActions
              itemId={data.id}
              damaged={data.damagedQuantity}
              inRepair={data.inRepairQuantity}
            />
          </Panel>
        )}
      </div>

      <ItemTexts item={data} locale={locale} />

      {editing && <ItemEditDialog item={data} onClose={() => setEditing(false)} />}
      {reporting && (
        <MaterialSheet
          open
          onOpenChange={setReporting}
          title={`${labels.reportDamage[locale]} · ${data.name}`}
        >
          <ReportDamageForm
            itemId={data.id}
            maxQuantity={data.stock.usable}
            locale={locale}
            onDone={() => {
              setReporting(false);
              void invalidate();
            }}
          />
        </MaterialSheet>
      )}
      {showQr && (
        <MaterialSheet open onOpenChange={setShowQr} title={labels.showQr[locale]}>
          <MaterialQrCode
            path={itemPath(data.code)}
            caption={format(text.qrCaption, locale, { name: data.name, code: data.code })}
          />
        </MaterialSheet>
      )}
    </div>
  );
};
