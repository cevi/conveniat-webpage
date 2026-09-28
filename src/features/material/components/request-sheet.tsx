'use client';

import { Segmented, Stepper } from '@/features/material/components/counter-ui';
import { MaterialItemImage } from '@/features/material/components/material-item-image';
import { format, labels } from '@/features/material/components/material-labels';
import {
  DateInput,
  Field,
  focusRing,
  inputClass,
  MaterialButton,
  MaterialSheet,
  NativeSelect,
  SheetFooter,
} from '@/features/material/components/material-ui';
import {
  materialQueryOptions,
  useInvalidateMaterial,
  useMaterialLocale,
  useNow,
} from '@/features/material/hooks/use-material';
import {
  basketLineCap,
  basketTotals,
  isOnOrderStep,
  orderStepOf,
} from '@/features/material/utils/basket';
import {
  CAMP_END,
  fromDateInput,
  nextDayInput,
  toDateInput,
} from '@/features/material/utils/dates';
import { trpc, type RouterOutputs } from '@/trpc/client';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Send, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

type CatalogItem = RouterOutputs['material']['getCatalog'][number];

interface Line {
  itemId: string;
  quantity: number;
}

const text = {
  title: { de: 'Material anfragen', en: 'Request material', fr: 'Demander du matériel' },
  pickup: { de: 'Abholung am', en: 'Pickup on', fr: 'Retrait le' },
  returnBy: { de: 'Rückgabe bis', en: 'Return by', fr: 'Retour jusqu’au' },
  tomorrow: { de: 'Morgen', en: 'Tomorrow', fr: 'Demain' },
  campEnd: { de: 'Lagerende', en: 'End of camp', fr: 'Fin du camp' },
  forWhom: { de: 'Für wen?', en: 'For whom?', fr: 'Pour qui ?' },
  forMe: { de: 'Für mich', en: 'For me', fr: 'Pour moi' },
  choose: { de: 'Wählen …', en: 'Choose …', fr: 'Choisir …' },
  responsible: { de: 'Verantwortlich', en: 'Responsible', fr: 'Responsable' },
  comment: { de: 'Bemerkung (optional)', en: 'Note (optional)', fr: 'Remarque (facultatif)' },
  freeForDays: {
    de: 'frei für diese Tage: {n} · max {max}',
    en: 'free for these days: {n} · max {max}',
    fr: 'libres pour ces jours : {n} · max {max}',
  },
  tooMany: {
    de: 'Nur {n} frei für diese Tage.',
    en: 'Only {n} free for these days.',
    fr: 'Seulement {n} libres pour ces jours.',
  },
  periodInvalid: {
    de: 'Die Rückgabe liegt vor der Abholung.',
    en: 'The return is before the pickup.',
    fr: 'Le retour est avant le retrait.',
  },
  send: {
    de: 'Anfrage senden · {lines}',
    en: 'Send request · {lines}',
    fr: 'Envoyer la demande · {lines}',
  },
  sent: {
    de: 'Angefragt: {numbers}. Das Materialteam bestätigt die Anfrage.',
    en: 'Requested: {numbers}. The material team confirms the request.',
    fr: 'Demandé : {numbers}. L’équipe matériel confirme la demande.',
  },
} satisfies Record<string, StaticTranslationString>;

const ME = 'me';

/**
 * The request form: until when, for whom, and how many of each article, capped at what is
 * free for those days and at the most one loan may take. Sends the whole basket as one request.
 */
export const RequestSheet: React.FC<{
  lines: Line[];
  items: CatalogItem[];
  onLinesChange: (lines: Line[]) => void;
  onClose: () => void;
}> = ({ lines, items, onLinesChange, onClose }) => {
  const locale = useMaterialLocale();
  const now = useNow();
  const router = useRouter();
  const invalidate = useInvalidateMaterial();
  const me = trpc.material.getMe.useQuery(undefined, materialQueryOptions);
  const send = trpc.material.createLoanRequest.useMutation();
  const hoefe = me.data?.hoefe ?? [];

  const today = toDateInput(now);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(() => nextDayInput(now));
  // one Hof, or none: then there is nothing to choose
  const [whom, setWhom] = useState(() => {
    if (hoefe.length === 0) return ME;
    return hoefe.length === 1 ? (hoefe[0]?.id ?? '') : '';
  });
  const [responsibleName, setResponsibleName] = useState(me.data?.name ?? '');
  const [comment, setComment] = useState('');

  const startDate = fromDateInput(start, 'start');
  const endDate = fromDateInput(end, 'end');
  const periodValid = startDate !== undefined && endDate !== undefined && endDate >= startDate;
  const period = trpc.material.getCatalog.useQuery(
    periodValid ? { startDate, endDate } : undefined,
    { ...materialQueryOptions, enabled: periodValid },
  );
  const byId = new Map((period.data ?? items).map((item) => [item.id, item]));
  const capOf = (itemId: string): number => {
    const item = byId.get(itemId);
    return item === undefined
      ? 0
      : basketLineCap({
          available: item.availableForPeriod,
          maxLoanQuantity: item.maxLoanQuantity,
        });
  };
  const stepOf = (itemId: string): number => orderStepOf(byId.get(itemId)?.orderStep);
  const overCap = lines.some((line) => line.quantity > capOf(line.itemId));
  const offStep = lines.some((line) => !isOnOrderStep(line.quantity, stepOf(line.itemId)));
  const totals = basketTotals(lines);
  const canSend =
    periodValid &&
    whom !== '' &&
    responsibleName.trim() !== '' &&
    lines.length > 0 &&
    !overCap &&
    !offStep &&
    !period.isFetching;

  const submit = (): void => {
    if (startDate === undefined || endDate === undefined) return;
    send.mutate(
      {
        ...(whom === ME ? { personId: me.data?.uuid ?? '' } : { hofId: whom }),
        responsibleName,
        ...(comment.trim() === '' ? {} : { comment }),
        startDate,
        endDate,
        lines,
      },
      {
        onSuccess: ({ numbers }) => {
          toast.success(
            format(text.sent, locale, { numbers: numbers.map((n) => `#${n}`).join(', ') }),
          );
          onLinesChange([]);
          onClose();
          void invalidate();
          router.push('/app/material');
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const whomOptions = [
    ...hoefe.map((hof) => ({ value: hof.id, label: hof.name })),
    { value: ME, label: text.forMe[locale] },
  ];
  const chip = (value: string, label: string): React.ReactNode => (
    <button
      type="button"
      aria-pressed={end === value}
      onClick={() => setEnd(value)}
      className={cn(
        'h-11 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-semibold',
        focusRing,
        end === value
          ? 'border-conveniat-green bg-conveniat-green text-white'
          : 'border-gray-300 bg-white text-gray-800',
      )}
    >
      {label}
    </button>
  );

  return (
    <MaterialSheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={text.title[locale]}
    >
      <div className="grid grid-cols-1 gap-3">
        <Field as="group" label={text.pickup[locale]}>
          <DateInput value={start} min={today} onChange={setStart} label={text.pickup[locale]} />
        </Field>
        <Field as="group" label={text.returnBy[locale]}>
          <div className="flex flex-wrap gap-2">
            {chip(nextDayInput(fromDateInput(start, 'start') ?? now), text.tomorrow[locale])}
            {CAMP_END >= today && chip(CAMP_END, text.campEnd[locale])}
            <DateInput
              value={end}
              min={start}
              onChange={setEnd}
              label={text.returnBy[locale]}
              className="min-w-40 flex-1"
            />
          </div>
        </Field>
        {!periodValid && (
          <p className="text-sm font-semibold text-red-700">{text.periodInvalid[locale]}</p>
        )}
      </div>

      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
        {lines.map((line) => {
          const item = byId.get(line.itemId);
          const name = item?.name ?? '…';
          const cap = capOf(line.itemId);
          const step = stepOf(line.itemId);
          return (
            <li key={line.itemId} className="space-y-2 px-3 py-3">
              <div className="flex items-center gap-3">
                <MaterialItemImage
                  name={name}
                  imageUrl={item === undefined ? '' : item.imageUrl}
                  className="size-10"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-gray-900">{name}</div>
                  <div className="truncate text-xs text-gray-500 tabular-nums">
                    {format(text.freeForDays, locale, {
                      n: item?.availableForPeriod ?? 0,
                      max: item?.maxLoanQuantity ?? 0,
                    })}
                    {step > 1 && ` · ${format(labels.inSteps, locale, { n: step })}`}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`${labels.remove[locale]}: ${name}`}
                  onClick={() => onLinesChange(lines.filter((entry) => entry !== line))}
                  className={cn(
                    'flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-red-700',
                    focusRing,
                  )}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
              <div className="flex justify-end">
                <Stepper
                  label={`${labels.quantity[locale]}: ${name}`}
                  value={line.quantity}
                  min={step}
                  max={Math.max(cap, line.quantity, 1)}
                  step={step}
                  onChange={(quantity) =>
                    onLinesChange(
                      lines.map((entry) => (entry === line ? { ...entry, quantity } : entry)),
                    )
                  }
                />
              </div>
              {line.quantity > cap && (
                <p className="text-right text-xs font-semibold text-red-700">
                  {format(text.tooMany, locale, { n: cap })}
                </p>
              )}
              {!isOnOrderStep(line.quantity, step) && (
                <p className="text-right text-xs font-semibold text-red-700">
                  {format(labels.offStep, locale, { n: step })}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <Field as="group" label={text.forWhom[locale]}>
        {whomOptions.length <= 3 ? (
          <Segmented
            label={text.forWhom[locale]}
            value={whom}
            onChange={setWhom}
            options={whomOptions}
          />
        ) : (
          <NativeSelect
            aria-label={text.forWhom[locale]}
            value={whom}
            onChange={(event) => setWhom(event.target.value)}
          >
            <option value="">{text.choose[locale]}</option>
            {whomOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field label={text.responsible[locale]}>
        <input
          className={inputClass}
          value={responsibleName}
          autoComplete="name"
          onChange={(event) => setResponsibleName(event.target.value)}
        />
      </Field>
      <Field label={text.comment[locale]}>
        <textarea
          className={cn(inputClass, 'h-20 py-2')}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </Field>
      <SheetFooter>
        <MaterialButton
          className="h-12 w-full text-base"
          loading={send.isPending}
          disabled={!canSend}
          onClick={submit}
        >
          <Send aria-hidden />
          <span className="truncate">
            {format(text.send, locale, {
              lines:
                totals.positions === 1
                  ? labels.onePosition[locale]
                  : format(labels.positions, locale, { n: totals.positions }),
            })}
          </span>
        </MaterialButton>
      </SheetFooter>
    </MaterialSheet>
  );
};
