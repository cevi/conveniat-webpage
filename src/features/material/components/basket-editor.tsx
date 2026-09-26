'use client';

import {
  holderInitials,
  SearchField,
  SectionTitle,
  Stepper,
  StickyAction,
} from '@/features/material/components/counter-ui';
import { MaterialItemImage } from '@/features/material/components/material-item-image';
import { format, formatDay, labels } from '@/features/material/components/material-labels';
import {
  DateInput,
  Field,
  focusRing,
  inputClass,
  MaterialButton,
  NativeSelect,
  Panel,
} from '@/features/material/components/material-ui';
import {
  materialQueryOptions,
  useInvalidateMaterial,
  useMaterialLocale,
  useNow,
  type MaterialItem,
  type MaterialLoan,
} from '@/features/material/hooks/use-material';
import { basketLineCap, basketTotals } from '@/features/material/utils/basket';
import {
  CAMP_END,
  fromDateInput,
  nextDayInput,
  toDateInput,
} from '@/features/material/utils/dates';
import { parseScan } from '@/features/material/utils/scan';
import { trpc } from '@/trpc/client';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronLeft, PackageOpen, Trash2, X } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const text = {
  to: { de: 'An wen', en: 'To whom', fr: 'À qui' },
  adjustTitle: { de: 'Abholung anpassen', en: 'Adjust pickup', fr: 'Adapter le retrait' },
  responsible: {
    de: 'Wer holt ab? (optional)',
    en: 'Who picks it up? (optional)',
    fr: 'Qui vient chercher ? (facultatif)',
  },
  personHof: { de: 'Hof (optional)', en: 'Hof (optional)', fr: 'Hof (facultatif)' },
  noHof: { de: 'Kein Hof', en: 'No Hof', fr: 'Aucun Hof' },
  material: {
    de: 'Material scannen oder suchen',
    en: 'Scan or search material',
    fr: 'Scanner ou chercher du matériel',
  },
  search: { de: 'Artikel suchen …', en: 'Search items …', fr: 'Chercher un article …' },
  freeMax: {
    de: 'frei {free} · max {max}',
    en: '{free} free · max {max}',
    fr: '{free} libres · max {max}',
  },
  noneFree: { de: 'keine frei', en: 'none free', fr: 'aucun libre' },
  onlyFree: {
    de: 'Nur {n} frei, der Rest fehlt am Regal.',
    en: 'Only {n} free, the rest is not on the shelf.',
    fr: 'Seulement {n} libres, le reste manque.',
  },
  consumed: { de: 'wird verbraucht', en: 'used up', fr: 'sera consommé' },
  counterOnly: {
    de: 'Wird nur sofort ausgegeben, nicht vorbereitet.',
    en: 'Only handed out at once, not prepared.',
    fr: 'Remis seulement sur place, pas préparé.',
  },
  emptyBasket: {
    de: 'Noch nichts im Korb. Scanne ein Etikett oder suche einen Artikel.',
    en: 'Nothing in the basket yet. Scan a label or search an item.',
    fr: 'Rien dans le panier. Scanne une étiquette ou cherche un article.',
  },
  removedAll: {
    de: 'Alles entfernt: die Vorbereitung wird storniert.',
    en: 'Everything removed: the preparation is cancelled.',
    fr: 'Tout retiré : la préparation est annulée.',
  },
  returnBy: { de: 'Rückgabe bis', en: 'Return by', fr: 'Retour jusqu’au' },
  tomorrow: { de: 'Morgen', en: 'Tomorrow', fr: 'Demain' },
  campEnd: { de: 'Lagerende', en: 'End of camp', fr: 'Fin du camp' },
  prepare: {
    de: 'Für später vorbereiten',
    en: 'Prepare for later',
    fr: 'Préparer pour plus tard',
  },
  prepareHint: {
    de: 'Das Material wird reserviert und erscheint am Abholtag unter «Heute vorbereitet».',
    en: 'The material is held and shows under “Prepared today” on the pickup day.',
    fr: 'Le matériel est réservé et apparaît le jour du retrait sous « Préparé aujourd’hui ».',
  },
  pickupOn: { de: 'Abholung am', en: 'Pickup on', fr: 'Retrait le' },
  comment: {
    de: 'Bemerkung (optional)',
    en: 'Note (optional)',
    fr: 'Remarque (facultatif)',
  },
  periodInvalid: {
    de: 'Die Rückgabe liegt vor der Abholung.',
    en: 'The return is before the pickup.',
    fr: 'Le retour est avant le retrait.',
  },
  issueButton: {
    de: '{lines} ausgeben · {pieces} Stück',
    en: 'Hand out {lines} · {pieces} pieces',
    fr: 'Remettre {lines} · {pieces} pièces',
  },
  prepareButton: {
    de: '{lines} vorbereiten · {pieces} Stück',
    en: 'Prepare {lines} · {pieces} pieces',
    fr: 'Préparer {lines} · {pieces} pièces',
  },
  cancelPrepared: {
    de: 'Vorbereitung stornieren',
    en: 'Cancel the preparation',
    fr: 'Annuler la préparation',
  },
  issued: {
    de: 'Ausgegeben: {numbers}',
    en: 'Handed out: {numbers}',
    fr: 'Remis : {numbers}',
  },
  prepared: {
    de: 'Vorbereitet: {numbers}',
    en: 'Prepared: {numbers}',
    fr: 'Préparé : {numbers}',
  },
  cancelled: { de: 'Storniert.', en: 'Cancelled.', fr: 'Annulé.' },
  notAnItem: {
    de: 'Das ist kein Artikel-Etikett.',
    en: 'That is not an item label.',
    fr: 'Ce n’est pas une étiquette d’article.',
  },
} satisfies Record<string, StaticTranslationString>;

/** Whom the basket goes to. A person may bring a Hof along, a Hof is the holder itself. */
export type BasketHolder =
  | { kind: 'HOF'; id: string; name: string }
  | { kind: 'PERSON'; id: string; name: string; hofId?: string };

/** Where the basket starts: empty for a new hand-out, or a prepared pickup to adjust. */
export interface BasketStart {
  holder: BasketHolder;
  prepared?: MaterialLoan[];
}

interface Line {
  itemId: string;
  quantity: number;
  isConsumption: boolean;
  /** what the prepared loans of this article already hold, free for this line */
  held: number;
}

const SEARCH_RESULTS = 6;

/** The prepared loans as basket lines, one per article with their quantities added up. */
const linesFromPrepared = (loans: readonly MaterialLoan[]): Line[] => {
  const lines = new Map<string, Line>();
  for (const loan of loans) {
    const line = lines.get(loan.item.id);
    lines.set(loan.item.id, {
      itemId: loan.item.id,
      quantity: (line?.quantity ?? 0) + loan.quantity,
      isConsumption: (line?.isConsumption ?? true) && loan.isConsumption,
      held: (line?.held ?? 0) + loan.quantity,
    });
  }
  return [...lines.values()];
};

const latest = (dates: Date[], fallback: string): string =>
  dates.length === 0
    ? fallback
    : toDateInput(new Date(Math.max(...dates.map((date) => date.getTime()))));

/** The article search above the basket: the first few matches, tap to add. */
const ItemSearch: React.FC<{
  items: MaterialItem[];
  onAdd: (item: MaterialItem) => void;
  heldFor: (itemId: string) => number;
}> = ({ items, onAdd, heldFor }) => {
  const locale = useMaterialLocale();
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const matches =
    needle === ''
      ? []
      : items
          .filter(
            (item) =>
              !item.isDisabled &&
              (item.name.toLowerCase().includes(needle) ||
                item.code.toLowerCase().includes(needle)),
          )
          .slice(0, SEARCH_RESULTS);

  const add = (item: MaterialItem): void => {
    onAdd(item);
    setQuery('');
  };

  return (
    <div className="space-y-2">
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder={text.search[locale]}
        onSubmit={() => {
          const [first] = matches;
          if (first !== undefined) add(first);
        }}
        onScan={(value) => {
          const scanned = parseScan(value, globalThis.location.origin);
          const item =
            scanned?.kind === 'item'
              ? items.find((entry) => entry.code === scanned.code)
              : undefined;
          if (item === undefined) {
            toast.error(text.notAnItem[locale]);
            return false;
          }
          add(item);
          return true;
        }}
      />
      {matches.length > 0 && (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {matches.map((item) => {
            const cap = basketLineCap({
              available: item.stock.available,
              maxLoanQuantity: item.maxLoanQuantity,
              held: heldFor(item.id),
            });
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => add(item)}
                  className={cn(
                    'flex min-h-12 w-full cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-gray-50',
                    focusRing,
                    'focus-visible:ring-inset',
                  )}
                >
                  <MaterialItemImage name={item.name} imageUrl={item.imageUrl} className="size-9" />
                  <span className="min-w-0 flex-1 truncate font-semibold text-gray-900">
                    {item.name}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 text-xs tabular-nums',
                      cap === 0 ? 'font-semibold text-red-700' : 'text-gray-500',
                    )}
                  >
                    {cap === 0
                      ? text.noneFree[locale]
                      : format(text.freeMax, locale, {
                          free: item.stock.available + heldFor(item.id),
                          max: item.maxLoanQuantity,
                        })}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

/** One article in the basket: how many, capped where the stock ends, and whether used up. */
const BasketLineRow: React.FC<{
  line: Line;
  item: MaterialItem | undefined;
  preparing: boolean;
  onChange: (line: Line) => void;
  onRemove: () => void;
}> = ({ line, item, preparing, onChange, onRemove }) => {
  const locale = useMaterialLocale();
  const name = item?.name ?? '…';
  const free = (item?.stock.available ?? 0) + line.held;
  const max = item?.maxLoanQuantity ?? line.quantity;
  // a preparation for a later day may count on pieces that are out today
  const cap = preparing ? max : basketLineCap({ available: free, maxLoanQuantity: max });
  return (
    <li className="space-y-2 px-3 py-3">
      <div className="flex items-center gap-3">
        <MaterialItemImage
          name={name}
          imageUrl={item === undefined ? '' : item.imageUrl}
          className="size-10"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-gray-900" title={name}>
            {name}
          </div>
          <div className="truncate text-xs text-gray-500 tabular-nums">
            {format(text.freeMax, locale, { free, max })}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${labels.remove[locale]}: ${name}`}
          className={cn(
            'flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-red-700',
            focusRing,
          )}
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 pl-13">
        {item?.isConsumable === true ? (
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="accent-conveniat-green size-5"
              checked={line.isConsumption}
              onChange={(event) => onChange({ ...line, isConsumption: event.target.checked })}
            />
            {text.consumed[locale]}
          </label>
        ) : (
          <span />
        )}
        <Stepper
          label={`${labels.quantity[locale]}: ${name}`}
          value={line.quantity}
          min={1}
          max={Math.max(cap, line.quantity, 1)}
          onChange={(quantity) => onChange({ ...line, quantity })}
        />
      </div>
      {!preparing && line.quantity > cap && (
        <p className="text-xs font-semibold text-red-700">
          {format(text.onlyFree, locale, { n: cap })}
        </p>
      )}
      {preparing && item?.isReservable === false && (
        <p className="text-xs font-semibold text-amber-800">{text.counterOnly[locale]}</p>
      )}
    </li>
  );
};

/**
 * The counter's basket: whom it goes to, the articles scanned or searched into it, until when,
 * and one button that books it all. Opened from a prepared pickup it starts with those loans
 * and books them as changed; what is taken out of it is cancelled.
 */
export const BasketEditor: React.FC<{ start: BasketStart; onClose: () => void }> = ({
  start,
  onClose,
}) => {
  const locale = useMaterialLocale();
  const now = useNow();
  const invalidate = useInvalidateMaterial();
  const inventory = trpc.material.getInventory.useQuery(undefined, materialQueryOptions);
  const holders = trpc.material.getHolderList.useQuery(undefined, materialQueryOptions);
  const book = trpc.material.createLoanBasket.useMutation();

  const prepared = start.prepared ?? [];
  const adjusting = prepared.length > 0;
  const [lines, setLines] = useState<Line[]>(() => linesFromPrepared(prepared));
  const [end, setEnd] = useState(() =>
    latest(
      prepared.map((loan) => loan.endDate),
      nextDayInput(now),
    ),
  );
  const [preparing, setPreparing] = useState(false);
  // a pickup prepared for a later day keeps its day when it is only adjusted
  const [pickup, setPickup] = useState(() => {
    const firstDay = prepared.map((loan) => toDateInput(loan.startDate)).toSorted()[0];
    return firstDay !== undefined && firstDay > toDateInput(now) ? firstDay : nextDayInput(now);
  });
  const [responsibleName, setResponsibleName] = useState('');
  const [comment, setComment] = useState('');
  const [personHofId, setPersonHofId] = useState(
    start.holder.kind === 'PERSON' ? (start.holder.hofId ?? '') : '',
  );

  const items = useMemo(() => inventory.data ?? [], [inventory.data]);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const heldFor = (itemId: string): number =>
    lines.find((line) => line.itemId === itemId)?.held ?? 0;

  const add = (item: MaterialItem): void => {
    setLines((current) => {
      const existing = current.find((line) => line.itemId === item.id);
      if (existing !== undefined) {
        return current.map((line) =>
          line === existing ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...current, { itemId: item.id, quantity: 1, isConsumption: false, held: 0 }];
    });
  };

  const totals = basketTotals(lines);
  const today = toDateInput(now);
  const endDate = fromDateInput(end, 'end');
  const startDate = preparing ? fromDateInput(pickup, 'start') : now;
  const periodReversed = endDate !== undefined && startDate !== undefined && endDate < startDate;
  const cancelsAll = adjusting && lines.length === 0;
  const canSubmit =
    !book.isPending && endDate !== undefined && startDate !== undefined && !periodReversed;

  const submit = (): void => {
    if (endDate === undefined || startDate === undefined) return;
    const { holder } = start;
    const hofId = holder.kind === 'HOF' ? holder.id : personHofId;
    book.mutate(
      {
        ...(hofId === '' ? {} : { hofId }),
        ...(holder.kind === 'PERSON' ? { personId: holder.id } : {}),
        ...(responsibleName.trim() === '' ? {} : { responsibleName }),
        ...(comment.trim() === '' ? {} : { comment }),
        mode: preparing ? 'RESERVE' : 'ISSUE',
        ...(preparing ? { startDate } : {}),
        endDate,
        lines: lines.map(({ itemId, quantity, isConsumption }) => ({
          itemId,
          quantity,
          isConsumption,
        })),
        preparedLoanIds: prepared.map((loan) => loan.id),
      },
      {
        onSuccess: ({ numbers }) => {
          const list = numbers.map((number) => `#${number}`).join(', ');
          if (numbers.length === 0) toast.success(text.cancelled[locale]);
          else
            toast.success(
              format(preparing ? text.prepared : text.issued, locale, { numbers: list }),
            );
          onClose();
          void invalidate();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

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

  let buttonLabel = format(preparing ? text.prepareButton : text.issueButton, locale, {
    lines:
      totals.positions === 1
        ? labels.onePosition[locale]
        : format(labels.positions, locale, { n: totals.positions }),
    pieces: totals.pieces,
  });
  if (cancelsAll) buttonLabel = text.cancelPrepared[locale];

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
        <h1 className="text-conveniat-green text-lg font-bold">
          {adjusting ? text.adjustTitle[locale] : labels.navHandOut[locale]}
        </h1>
      </div>

      <section>
        <SectionTitle>{text.to[locale]}</SectionTitle>
        <Panel className="space-y-3 p-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="bg-conveniat-green flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
            >
              {holderInitials(start.holder.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold text-gray-900">{start.holder.name}</div>
              <div className="text-xs text-gray-500">
                {start.holder.kind === 'HOF' ? labels.hof[locale] : labels.person[locale]}
              </div>
            </div>
            {!adjusting && (
              <MaterialButton variant="ghost" onClick={onClose}>
                {labels.change[locale]}
              </MaterialButton>
            )}
          </div>
          {start.holder.kind === 'PERSON' && !adjusting && (
            <Field label={text.personHof[locale]}>
              <NativeSelect
                value={personHofId}
                onChange={(event) => setPersonHofId(event.target.value)}
              >
                <option value="">{text.noHof[locale]}</option>
                {holders.data?.hoefe.map((hof) => (
                  <option key={hof.id} value={hof.id}>
                    {hof.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
          {start.holder.kind === 'HOF' && !adjusting && (
            <Field label={text.responsible[locale]}>
              <input
                className={inputClass}
                value={responsibleName}
                autoComplete="off"
                onChange={(event) => setResponsibleName(event.target.value)}
              />
            </Field>
          )}
        </Panel>
      </section>

      <section>
        <SectionTitle>{text.material[locale]}</SectionTitle>
        <ItemSearch items={items} onAdd={add} heldFor={heldFor} />
      </section>

      <Panel>
        {lines.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-500">
            {adjusting ? text.removedAll[locale] : text.emptyBasket[locale]}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {lines.map((line) => (
              <BasketLineRow
                key={line.itemId}
                line={line}
                item={byId.get(line.itemId)}
                preparing={preparing}
                onChange={(next) =>
                  setLines((current) => current.map((entry) => (entry === line ? next : entry)))
                }
                onRemove={() => setLines((current) => current.filter((entry) => entry !== line))}
              />
            ))}
          </ul>
        )}
      </Panel>

      {!cancelsAll && (
        <section className="space-y-3">
          <Field as="group" label={text.returnBy[locale]}>
            <div className="flex flex-wrap gap-2">
              {chip(nextDayInput(now), text.tomorrow[locale])}
              {CAMP_END >= today && chip(CAMP_END, text.campEnd[locale])}
              <DateInput
                value={end}
                min={today}
                onChange={setEnd}
                label={text.returnBy[locale]}
                className="min-w-40 flex-1"
              />
            </div>
          </Field>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-3">
            <input
              type="checkbox"
              className="accent-conveniat-green mt-0.5 size-5 shrink-0"
              checked={preparing}
              onChange={(event) => setPreparing(event.target.checked)}
            />
            <span className="min-w-0">
              <span className="block font-semibold text-gray-900">{text.prepare[locale]}</span>
              <span className="block text-xs text-gray-500">{text.prepareHint[locale]}</span>
            </span>
          </label>
          {preparing && (
            <Field as="group" label={text.pickupOn[locale]}>
              <DateInput
                value={pickup}
                min={today}
                onChange={setPickup}
                label={text.pickupOn[locale]}
              />
            </Field>
          )}
          {periodReversed && (
            <p className="text-sm font-semibold text-red-700">{text.periodInvalid[locale]}</p>
          )}
          <Field label={text.comment[locale]}>
            <input
              className={inputClass}
              value={comment}
              autoComplete="off"
              onChange={(event) => setComment(event.target.value)}
            />
          </Field>
        </section>
      )}

      <StickyAction>
        <MaterialButton
          className="h-12 w-full text-base"
          variant={cancelsAll ? 'danger' : 'primary'}
          loading={book.isPending}
          disabled={!canSubmit || (lines.length === 0 && !cancelsAll)}
          onClick={submit}
        >
          {cancelsAll ? <X aria-hidden /> : <PackageOpen aria-hidden />}
          <span className="truncate">{buttonLabel}</span>
        </MaterialButton>
        {!cancelsAll && endDate !== undefined && (
          <p className="mt-1 text-center text-xs text-gray-500">
            {text.returnBy[locale]} {formatDay(endDate, locale)}
          </p>
        )}
      </StickyAction>
    </div>
  );
};
