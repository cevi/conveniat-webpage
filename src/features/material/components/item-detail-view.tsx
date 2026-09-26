'use client';

import { ItemEditDialog } from '@/features/material/components/item-edit-dialog';
import { LoanCard } from '@/features/material/components/loan-card';
import { IncidentForm, LoanDetailDialog } from '@/features/material/components/loan-detail-dialog';
import { LoanRequestDialog } from '@/features/material/components/loan-request-dialog';
import { MaterialItemImage } from '@/features/material/components/material-item-image';
import { format, labels } from '@/features/material/components/material-labels';
import { MaterialQrCode } from '@/features/material/components/material-qr-code';
import { MaterialQueryError } from '@/features/material/components/material-query-error';
import { ItemStatusBadge } from '@/features/material/components/material-status-badge';
import { MaterialStockBar } from '@/features/material/components/material-stock-bar';
import {
  LoadingState,
  MaterialButton,
  MaterialSheet,
  NumberInput,
  Panel,
} from '@/features/material/components/material-ui';
import {
  materialQueryOptions,
  useInvalidateMaterial,
  useMaterialLocale,
  useNow,
  type MaterialLoan,
} from '@/features/material/hooks/use-material';
import { trpc } from '@/trpc/client';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { AlertTriangle, ArrowLeft, Pencil, QrCode, Wrench } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

const text = {
  back: { de: 'Zurück zum Material', en: 'Back to material', fr: 'Retour au matériel' },
  openLoans: {
    de: 'Offene Reservationen und Ausleihen',
    en: 'Open reservations and loans',
    fr: 'Réservations et prêts ouverts',
  },
  unit: { de: '{n} {unit}', en: '{n} {unit}', fr: '{n} {unit}' },
  repair: { de: 'Reparatur', en: 'Repair', fr: 'Réparation' },
  startRepair: {
    de: 'Beschädigte in Reparatur geben',
    en: 'Send damaged to repair',
    fr: 'Envoyer en réparation',
  },
  finishRepair: {
    de: 'Reparatur abgeschlossen',
    en: 'Repair finished',
    fr: 'Réparation terminée',
  },
  writeOff: {
    de: 'Beschädigte ausbuchen',
    en: 'Write off damaged',
    fr: 'Sortir les endommagés',
  },
  notRepairable: {
    de: 'Nicht reparierbar',
    en: 'Beyond repair',
    fr: 'Irréparable',
  },
  counterOnlyHint: {
    de: 'Dieser Artikel wird nur direkt im Materialdepot ausgegeben.',
    en: 'This item is only handed out at the material depot.',
    fr: 'Cet article est remis uniquement au dépôt de matériel.',
  },
  qrCaption: { de: '{name} · {code}', en: '{name} · {code}', fr: '{name} · {code}' },
} satisfies Record<string, StaticTranslationString>;

type StockAction = 'START_REPAIR' | 'FINISH_REPAIR' | 'WRITE_OFF_DAMAGED' | 'MARK_REPAIRED_DAMAGED';

const stockActionLabel: Record<StockAction, StaticTranslationString> = {
  START_REPAIR: text.startRepair,
  FINISH_REPAIR: text.finishRepair,
  WRITE_OFF_DAMAGED: text.writeOff,
  MARK_REPAIRED_DAMAGED: text.notRepairable,
};

/** Repair workflow: damaged pieces go to repair, come back, or leave the stock. */
const StockActions: React.FC<{
  itemId: string;
  damaged: number;
  inRepair: number;
}> = ({ itemId, damaged, inRepair }) => {
  const locale = useMaterialLocale();
  const invalidate = useInvalidateMaterial();
  const adjust = trpc.material.adjustItemStock.useMutation();
  const [quantity, setQuantity] = useState(1);

  const actions: [StockAction, number][] = [
    ['START_REPAIR', damaged],
    ['WRITE_OFF_DAMAGED', damaged],
    ['FINISH_REPAIR', inRepair],
    ['MARK_REPAIRED_DAMAGED', inRepair],
  ];

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

export const ItemDetailView: React.FC<{ code: string }> = ({ code }) => {
  const locale = useMaterialLocale();
  const now = useNow();
  const item = trpc.material.getItem.useQuery({ code }, materialQueryOptions);
  const me = trpc.material.getMe.useQuery(undefined, materialQueryOptions);
  const invalidate = useInvalidateMaterial();
  const isMaterialTeam = me.data?.isMaterialTeam ?? false;

  const [reserving, setReserving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [openLoan, setOpenLoan] = useState<MaterialLoan | undefined>();

  if (item.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!item.data) return <MaterialQueryError error={item.error} />;

  const data = item.data;
  // nothing free today still leaves later days; the dialog asks for the chosen period
  const canRequest =
    !data.isDisabled && data.stock.usable > 0 && (data.isReservable || isMaterialTeam);

  const numbers: [string, number, string][] = [
    [labels.maxPerLoan[locale], data.maxLoanQuantity, 'text-gray-900'],
    [labels.available[locale], data.stock.available, 'text-green-700'],
    [labels.reserved[locale], data.stock.reserved, 'text-blue-700'],
    [labels.issued[locale], data.stock.issued, 'text-orange-600'],
    [labels.damaged[locale], data.damagedQuantity, 'text-red-600'],
    [labels.inRepair[locale], data.inRepairQuantity, 'text-purple-700'],
  ];

  return (
    <div className="space-y-4">
      <Link
        href="/app/material/catalog"
        className="inline-flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {text.back[locale]}
      </Link>

      <div className="grid gap-4 lg:grid-cols-2">
        <MaterialItemImage
          name={data.name}
          imageUrl={data.imageUrl}
          className="aspect-[4/3] w-full rounded-2xl text-6xl"
        />
        <div className="space-y-4">
          <div>
            <div className="font-mono text-xs tracking-wider text-gray-500 uppercase">
              {data.category.name} · {data.code}
            </div>
            <h1 className="text-conveniat-green mt-1 text-2xl font-bold">{data.name}</h1>
            <div className="mt-2">
              <ItemStatusBadge status={data.status} locale={locale} />
            </div>
          </div>

          <Panel>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-gray-100">
              {numbers.map(([label, value, tone]) => (
                <div key={label} className="bg-white px-4 py-3">
                  <dt className="text-xs text-gray-500">{label}</dt>
                  <dd className={cn('text-xl font-bold tabular-nums', tone)}>
                    {format(text.unit, locale, { n: value, unit: data.unit })}
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
              />
            </div>
          </Panel>

          {/* on a phone the main action rides above the app's bottom bar, in thumb reach */}
          <div
            data-material-thumb-action
            className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-10 sm:static"
          >
            <MaterialButton
              className="h-12 w-full text-base shadow-lg sm:shadow-none"
              disabled={!canRequest}
              onClick={() => setReserving(true)}
            >
              {labels.reserveLong[locale]}
            </MaterialButton>
          </div>
          {!data.isReservable && (
            <p className="text-center text-xs text-gray-500">{text.counterOnlyHint[locale]}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <MaterialButton variant="danger" onClick={() => setReporting(true)}>
              <AlertTriangle aria-hidden />
              {labels.reportDamage[locale]}
            </MaterialButton>
            {isMaterialTeam && (
              <>
                <MaterialButton variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil aria-hidden />
                  {labels.edit[locale]}
                </MaterialButton>
                <MaterialButton variant="secondary" onClick={() => setShowQr(true)}>
                  <QrCode aria-hidden />
                  QR
                </MaterialButton>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={labels.description[locale]}>
          <div className="space-y-3 p-4 text-sm text-gray-700">
            <p className="whitespace-pre-line">{data.description}</p>
            {data.usageNotes !== null && data.usageNotes !== '' && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                <span className="font-semibold">{labels.usageNotes[locale]}: </span>
                {data.usageNotes}
              </p>
            )}
          </div>
        </Panel>
        <Panel title={labels.returnInstructions[locale]}>
          <p className="p-4 text-sm whitespace-pre-line text-gray-700">{data.returnInstructions}</p>
        </Panel>
      </div>

      {data.openLoans.length > 0 && (
        <Panel title={text.openLoans[locale]}>
          <ul className="divide-y divide-gray-100">
            {data.openLoans.map((loan) => (
              <li key={loan.id}>
                <LoanCard loan={loan} locale={locale} now={now} onOpen={setOpenLoan} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {isMaterialTeam && (data.damagedQuantity > 0 || data.inRepairQuantity > 0) && (
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

      {reserving && (
        <LoanRequestDialog
          item={data}
          open
          onOpenChange={setReserving}
          isMaterialTeam={isMaterialTeam}
        />
      )}
      {editing && <ItemEditDialog item={data} onClose={() => setEditing(false)} />}
      {reporting && (
        <MaterialSheet
          open
          onOpenChange={setReporting}
          title={`${labels.reportDamage[locale]} · ${data.name}`}
        >
          <IncidentForm
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
        <MaterialSheet open onOpenChange={setShowQr} title="QR">
          <MaterialQrCode
            path={`/app/material/catalog?item=${encodeURIComponent(data.code)}`}
            caption={format(text.qrCaption, locale, { name: data.name, code: data.code })}
          />
        </MaterialSheet>
      )}
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
