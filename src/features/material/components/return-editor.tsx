'use client';

import {
  HolderAvatar,
  SectionTitle,
  Stepper,
  StickyAction,
} from '@/features/material/components/counter-ui';
import { IncidentPhotoField } from '@/features/material/components/incident-photo-field';
import { MaterialItemImage } from '@/features/material/components/material-item-image';
import { format, formatDay, labels } from '@/features/material/components/material-labels';
import { MaterialQrCode } from '@/features/material/components/material-qr-code';
import { MaterialQueryError } from '@/features/material/components/material-query-error';
import {
  EmptyState,
  focusRing,
  inputClass,
  LoadingState,
  MaterialButton,
  MaterialSheet,
  Panel,
} from '@/features/material/components/material-ui';
import { useIncidentPhotoUpload } from '@/features/material/hooks/use-incident-photo-upload';
import {
  materialQueryOptions,
  useInvalidateMaterial,
  useMaterialLocale,
  useNow,
  type MaterialLoan,
} from '@/features/material/hooks/use-material';
import type { LoanHolder } from '@/features/material/utils/holders';
import {
  completeReturn,
  isReturnValid,
  withCondition,
  withReturned,
  type ReturnDraft,
} from '@/features/material/utils/returns';
import { loanPath } from '@/features/material/utils/scan';
import type { MaterialCondition } from '@/lib/prisma/client';
import { trpc } from '@/trpc/client';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronLeft, PackageCheck, QrCode } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

const text = {
  hasOut: { de: 'Hat draussen', en: 'Has out', fr: 'A dehors' },
  nothingOut: {
    de: 'Hat gerade nichts draussen.',
    en: 'Has nothing out right now.',
    fr: 'N’a rien dehors pour le moment.',
  },
  out: { de: '{n} draussen', en: '{n} out', fr: '{n} dehors' },
  ok: { de: 'OK', en: 'OK', fr: 'OK' },
  damaged: { de: 'Defekt', en: 'Broken', fr: 'Cassé' },
  missing: { de: 'Fehlt', en: 'Missing', fr: 'Manque' },
  usedUp: { de: 'Verbraucht', en: 'Used up', fr: 'Consommé' },
  condition: { de: 'Zustand', en: 'Condition', fr: 'État' },
  returned: { de: 'Zurück', en: 'Back', fr: 'Rendu' },
  ofWhichDamaged: { de: 'davon defekt', en: 'of which broken', fr: 'dont cassés' },
  missingHint: { de: 'Fehlend: {n}', en: 'Missing: {n}', fr: 'Manquant : {n}' },
  usedUpHint: { de: 'Verbraucht: {n}', en: 'Used up: {n}', fr: 'Consommé : {n}' },
  note: {
    de: 'Was ist passiert? (optional)',
    en: 'What happened? (optional)',
    fr: 'Que s’est-il passé ? (facultatif)',
  },
  include: { de: 'Kommt jetzt zurück', en: 'Comes back now', fr: 'Revient maintenant' },
  notNow: { de: 'nicht jetzt', en: 'not now', fr: 'pas maintenant' },
  invalid: {
    de: '«Fehlt» braucht fehlende Stück, «Defekt» mindestens ein defektes, das zurück ist.',
    en: '“Missing” needs missing pieces, “broken” at least one broken piece that is back.',
    fr: '« Manque » demande des pièces manquantes, « cassé » au moins une pièce cassée rendue.',
  },
  finish: {
    de: 'Rücknahme abschliessen · {n} Stück',
    en: 'Finish take-back · {n} pieces',
    fr: 'Terminer le retour · {n} pièces',
  },
  done: {
    de: 'Zurückgenommen: {n} Stück',
    en: 'Taken back: {n} pieces',
    fr: 'Repris : {n} pièces',
  },
  loanLabel: { de: 'Etikett', en: 'Label', fr: 'Étiquette' },
  notOut: {
    de: 'Ausleihe #{n} ist nicht mehr draussen.',
    en: 'Loan #{n} is no longer out.',
    fr: 'Le prêt n° {n} n’est plus dehors.',
  },
} satisfies Record<string, StaticTranslationString>;

interface LineState extends ReturnDraft {
  included: boolean;
  note: string;
  photoKey: string | undefined;
}

const CHIPS: MaterialCondition[] = ['OK', 'DAMAGED', 'MISSING'];

const chipTone: Record<MaterialCondition, string> = {
  OK: 'border-green-600 bg-green-50 text-green-800',
  LIGHT_DAMAGE: 'border-amber-500 bg-amber-50 text-amber-900',
  DAMAGED: 'border-red-600 bg-red-50 text-red-800',
  MISSING: 'border-gray-700 bg-gray-100 text-gray-900',
};

/** One loan of the take-back: how many came back, and in which state. */
const ReturnLine: React.FC<{
  loan: MaterialLoan;
  line: LineState;
  highlighted: boolean;
  /** merges into the line's latest state, so a photo upload that ends later loses no edit */
  onChange: (patch: Partial<LineState>) => void;
  onShowLabel: () => void;
}> = ({ loan, line, highlighted, onChange, onShowLabel }) => {
  const locale = useMaterialLocale();
  const now = useNow();
  const photo = useIncidentPhotoUpload((photoKey) => onChange({ photoKey }));
  const consumable = loan.item.isConsumable;
  const overdue = loan.endDate < now;
  const gone = line.issued - line.returned;
  const valid = isReturnValid(line);
  const chipLabel: Record<MaterialCondition, string> = {
    OK: text.ok[locale],
    LIGHT_DAMAGE: text.damaged[locale],
    DAMAGED: text.damaged[locale],
    MISSING: consumable ? text.usedUp[locale] : text.missing[locale],
  };

  return (
    <li
      className={cn(
        'space-y-2 px-3 py-3',
        highlighted && 'bg-conveniat-green/5 ring-conveniat-green ring-2 ring-inset',
        !line.included && 'bg-gray-50',
      )}
    >
      <div className="flex items-center gap-3">
        <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            aria-label={`${text.include[locale]}: ${loan.item.name}`}
            className="accent-conveniat-green size-5"
            checked={line.included}
            onChange={(event) => onChange({ included: event.target.checked })}
          />
        </label>
        <MaterialItemImage
          name={loan.item.name}
          imageUrl={loan.item.imageUrl}
          className="size-10"
        />
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              'truncate font-semibold',
              line.included ? 'text-gray-900' : 'text-gray-500',
            )}
          >
            {loan.item.name}
          </div>
          <div
            className={cn(
              'truncate text-xs',
              overdue ? 'font-semibold text-red-700' : 'text-gray-500',
            )}
          >
            {format(text.out, locale, { n: line.issued })} ·{' '}
            {overdue
              ? format(labels.overdueSince, locale, { day: formatDay(loan.endDate, locale) })
              : format(labels.dueOn, locale, { day: formatDay(loan.endDate, locale) })}
            {!line.included && ` · ${text.notNow[locale]}`}
          </div>
        </div>
        <button
          type="button"
          onClick={onShowLabel}
          aria-label={`${text.loanLabel[locale]} #${loan.number}`}
          className={cn(
            'flex h-11 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 font-mono text-xs text-gray-500 hover:bg-gray-100',
            focusRing,
          )}
        >
          <QrCode className="size-4" aria-hidden />#{loan.number}
        </button>
      </div>

      {line.included && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:pl-14">
            <div role="radiogroup" aria-label={text.condition[locale]} className="flex gap-1">
              {CHIPS.map((condition) => (
                <button
                  key={condition}
                  type="button"
                  role="radio"
                  aria-checked={line.condition === condition}
                  disabled={condition !== 'OK' && line.issued === 0}
                  onClick={() => onChange(withCondition(line, condition))}
                  className={cn(
                    'h-11 min-w-14 cursor-pointer rounded-lg border px-2.5 text-sm font-semibold',
                    focusRing,
                    line.condition === condition
                      ? chipTone[condition]
                      : 'border-gray-300 bg-white text-gray-700',
                  )}
                >
                  {chipLabel[condition]}
                </button>
              ))}
            </div>
            <Stepper
              label={`${text.returned[locale]}: ${loan.item.name}`}
              value={line.returned}
              max={line.issued}
              onChange={(returned) => onChange(withReturned(line, returned))}
            />
          </div>
          {line.condition === 'DAMAGED' && (
            <div className="flex items-center justify-end gap-3 sm:pl-14">
              <span className="text-sm font-semibold text-red-800">
                {text.ofWhichDamaged[locale]}
              </span>
              <Stepper
                label={`${text.ofWhichDamaged[locale]}: ${loan.item.name}`}
                value={line.damaged}
                min={1}
                max={Math.max(line.returned, 1)}
                onChange={(damaged) => onChange({ damaged })}
              />
            </div>
          )}
          {gone > 0 && (
            <p className="text-right text-sm font-semibold text-gray-800">
              {format(consumable ? text.usedUpHint : text.missingHint, locale, { n: gone })}
            </p>
          )}
          {!valid && <p className="text-sm font-semibold text-red-700">{text.invalid[locale]}</p>}
          {line.condition !== 'OK' && (
            <div className="space-y-2 sm:pl-14">
              <input
                className={inputClass}
                aria-label={text.note[locale]}
                placeholder={text.note[locale]}
                value={line.note}
                autoComplete="off"
                onChange={(event) => onChange({ note: event.target.value })}
              />
              <IncidentPhotoField upload={photo} />
            </div>
          )}
        </>
      )}
    </li>
  );
};

/**
 * Takes back what one holder brings: every loan they have out, filled in as "all back, all
 * fine", so only a deviation needs a tap. A loan that does not come back yet is unticked; the
 * one whose label was scanned is the only one ticked. One button books it all.
 */
export const ReturnEditor: React.FC<{
  holder: LoanHolder;
  scannedNumber?: number | undefined;
  onClose: () => void;
}> = ({ holder, scannedNumber, onClose }) => {
  const locale = useMaterialLocale();
  const invalidate = useInvalidateMaterial();
  const open = trpc.material.getOpenLoansForHolder.useQuery(
    holder.kind === 'HOF' ? { hofId: holder.id } : { personId: holder.id },
    materialQueryOptions,
  );
  const giveBack = trpc.material.returnLoanBasket.useMutation();
  const [edits, setEdits] = useState<Record<string, LineState>>({});
  const [label, setLabel] = useState<MaterialLoan | undefined>();

  if (open.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!open.data) return <MaterialQueryError error={open.error} />;
  const loans = open.data.loans;
  // a label scanned after its loan came back: say so, and leave every line to choose
  const scannedGone =
    scannedNumber !== undefined && !loans.some((loan) => loan.number === scannedNumber);
  const initialLine = (loan: MaterialLoan): LineState => ({
    ...completeReturn(loan.issuedQuantity ?? loan.quantity),
    included: scannedNumber === undefined || scannedGone || loan.number === scannedNumber,
    note: '',
    photoKey: undefined,
  });
  const lineOf = (loan: MaterialLoan): LineState => edits[loan.id] ?? initialLine(loan);
  const included = loans.filter((loan) => lineOf(loan).included);
  const valid = included.every((loan) => isReturnValid(lineOf(loan)));
  const pieces = included.reduce((sum, loan) => sum + lineOf(loan).returned, 0);
  const name =
    open.data.name ??
    (holder.kind === 'HOF' ? labels.unknownHof[locale] : labels.unknownPerson[locale]);

  const submit = (): void => {
    giveBack.mutate(
      {
        lines: included.map((loan) => {
          const line = lineOf(loan);
          return {
            loanId: loan.id,
            returnedQuantity: line.returned,
            condition: line.condition,
            damagedQuantity: line.condition === 'DAMAGED' ? line.damaged : 0,
            ...(line.note.trim() === '' ? {} : { note: line.note }),
            ...(line.photoKey === undefined ? {} : { photoKey: line.photoKey }),
          };
        }),
      },
      {
        onSuccess: (result) => {
          toast.success(format(text.done, locale, { n: result.pieces }));
          onClose();
          void invalidate();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1">
        <MaterialButton
          variant="ghost"
          className="w-11 px-0"
          aria-label={labels.back[locale]}
          onClick={onClose}
        >
          <ChevronLeft aria-hidden />
        </MaterialButton>
        <HolderAvatar name={name} className="size-9 text-xs" />
        <h1 className="text-conveniat-green min-w-0 truncate text-lg font-bold">{name}</h1>
      </div>
      {scannedGone && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {format(text.notOut, locale, { n: scannedNumber })}
        </p>
      )}
      <section>
        <SectionTitle count={loans.length}>{text.hasOut[locale]}</SectionTitle>
        <Panel>
          {loans.length === 0 ? (
            <EmptyState text={text.nothingOut[locale]} />
          ) : (
            <ul className="divide-y divide-gray-100">
              {loans.map((loan) => (
                <ReturnLine
                  key={loan.id}
                  loan={loan}
                  line={lineOf(loan)}
                  highlighted={loan.number === scannedNumber}
                  onChange={(patch) =>
                    setEdits((current) => ({
                      ...current,
                      [loan.id]: { ...(current[loan.id] ?? initialLine(loan)), ...patch },
                    }))
                  }
                  onShowLabel={() => setLabel(loan)}
                />
              ))}
            </ul>
          )}
        </Panel>
      </section>
      {loans.length > 0 && (
        <StickyAction>
          <MaterialButton
            className="h-12 w-full text-base"
            loading={giveBack.isPending}
            disabled={included.length === 0 || !valid}
            onClick={submit}
          >
            <PackageCheck aria-hidden />
            <span className="truncate">{format(text.finish, locale, { n: pieces })}</span>
          </MaterialButton>
        </StickyAction>
      )}
      {label !== undefined && (
        <MaterialSheet
          open
          onOpenChange={(isOpen) => {
            if (!isOpen) setLabel(undefined);
          }}
          title={format(labels.loanNumber, locale, { n: label.number })}
        >
          <MaterialQrCode
            path={loanPath(label.number)}
            caption={`#${label.number} · ${label.issuedQuantity ?? label.quantity} × ${label.item.name} · ${name}`}
          />
        </MaterialSheet>
      )}
    </div>
  );
};
