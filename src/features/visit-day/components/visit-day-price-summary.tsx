'use client';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';
import { formatChf } from '@/features/billing-core/money';
import type { VisitDaySelectionBlock } from '@/features/payload-cms/components/form/types';
import type { VisitDayPrices } from '@/features/visit-day/billing/visit-day-bill-amount';
import { calculateVisitDayBill } from '@/features/visit-day/billing/visit-day-bill-amount';
import { WITHOUT_LUNCH } from '@/features/visit-day/visit-day-choices';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useTRPC } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useQuery } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import type React from 'react';
import { useWatch } from 'react-hook-form';

const titleText: StaticTranslationString = {
  de: 'Deine Tickets',
  en: 'Your tickets',
  fr: 'Tes billets',
};

const totalText: StaticTranslationString = {
  de: 'Total',
  en: 'Total',
  fr: 'Total',
};

const choosePersonsText: StaticTranslationString = {
  de: 'Sobald ihr die Anzahl Personen gewählt habt, seht ihr hier euren Preis.',
  en: 'Once you have chosen the number of persons, you see your price here.',
  fr: 'Dès que vous avez choisi le nombre de personnes, vous voyez votre prix ici.',
};

const withoutRailTicketText: StaticTranslationString = {
  de: 'SBB-Tageskarte entfällt (GA, unter 6)',
  en: 'No SBB day pass needed (GA, under 6)',
  fr: 'Pas de carte journalière CFF (AG, moins de 6 ans)',
};

const vatText = (rate: number, locale: Locale): string => {
  const percent = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 2 }).format(rate);
  const texts: Record<Locale, string> = {
    de: `zzgl. ${percent}% MWST`,
    en: `plus ${percent}% VAT`,
    fr: `TVA ${percent} % en sus`,
  };
  return texts[locale];
};

const railTicketHint: StaticTranslationString = {
  de: 'Beim Lagerplatz gibt es keine Parkplätze, deshalb reisen alle mit dem ÖV an. Die SBB-Tageskarte gehört darum zum Ticket, zu einem Spezialpreis.',
  en: 'There is no parking near the campsite, so everyone travels by public transport. The SBB day pass is therefore part of the ticket, at a special price.',
  fr: 'Il n’y a pas de places de parc près du terrain du camp, tout le monde vient donc en transports publics. La carte journalière CFF fait donc partie du billet, à un prix spécial.',
};

const billHint: StaticTranslationString = {
  de: 'Du erhältst die Rechnung per E-Mail. Die Anmeldung gilt, sobald sie bezahlt ist.',
  en: 'You receive the bill by email. The registration counts once it is paid.',
  fr: 'Tu reçois la facture par e-mail. L’inscription est valable dès qu’elle est payée.',
};

const isFieldName = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value !== '';

/** How many persons the answer names, at most the field allows; undefined before the choice. */
const personsOf = (answer: unknown, maxPersons: number): number | undefined => {
  const count =
    typeof answer === 'number'
      ? answer
      : Number.parseInt(typeof answer === 'string' ? answer : '', 10);
  if (!Number.isFinite(count) || count < 1) return undefined;
  return Math.min(count, maxPersons);
};

/**
 * One line of the summary. What a label adds in brackets, like "(ganze Schweiz)", goes on a muted
 * line of its own, so a narrow column breaks between the two parts instead of inside a word.
 */
const SummaryRow: React.FC<{
  quantity: number;
  label: string;
  amount: string;
  isSaving?: boolean;
}> = ({ quantity, label, amount, isSaving = false }) => {
  const [, title = label, detail] = /^(.*?) \((.*)\)$/.exec(label) ?? [];
  return (
    <li className="flex items-baseline justify-between gap-4 text-[15px]">
      <span className="flex flex-col">
        <span className={cn(isSaving ? 'text-green-700' : 'text-heading')}>
          <span className="text-green-700 tabular-nums">{quantity} × </span>
          {title}
        </span>
        {detail !== undefined && <span className="text-[13px] text-green-700">{detail}</span>}
      </span>
      <span className={cn('shrink-0 tabular-nums', isSaving ? 'text-green-700' : 'text-heading')}>
        {amount}
      </span>
    </li>
  );
};

/** The two persons a registration may name at most when the field sets no maximum. */
const DEFAULT_MAX_PERSONS = 2;

/**
 * What the Besuchstag registration costs, next to the form while it is filled in, like the order
 * summary of a shop. Once the persons are chosen it shows the whole package, lunch and SBB day pass
 * included, and every later answer can only take something off: lunch for those who bring their
 * own, the day pass of a GA holder or a child under 6, shown as a saving. The total is the one
 * the bill charges.
 */
export const VisitDayPriceSummary: React.FC<{ field: VisitDaySelectionBlock }> = ({ field }) => {
  const trpc = useTRPC();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const prices = useQuery(trpc.visitDay.getVisitDayPrices.queryOptions());
  const maxPersons = field.maxPersons ?? DEFAULT_MAX_PERSONS;
  const travelPassNames = Array.from({ length: maxPersons }, (_, index) =>
    isFieldName(field.travelPassField)
      ? `${field.travelPassField}_${String(index + 1)}`
      : field.personCountField,
  );
  const [personsAnswer, lunchAnswer, ...travelPassAnswers] = useWatch({
    name: [
      field.personCountField,
      isFieldName(field.lunchField) ? field.lunchField : field.personCountField,
      ...travelPassNames,
    ],
  }) as unknown[];

  // a client restoring a cache from before the prices were split has no entry fee
  const data = prices.data as Partial<VisitDayPrices> | null | undefined;
  if (data?.entryFee === undefined) return <></>;
  const priceList: VisitDayPrices = {
    entryFee: data.entryFee,
    lunchFee: data.lunchFee ?? 0,
    railTicket: data.railTicket ?? 0,
    vatRate: data.vatRate ?? 0,
  };

  const persons = personsOf(personsAnswer, maxPersons);
  if (persons === undefined) {
    return (
      <aside className="flex flex-col gap-2">
        <SectionLabel>{titleText[locale]}</SectionLabel>
        <Card className="px-5 py-4 text-[15px] text-green-700">{choosePersonsText[locale]}</Card>
      </aside>
    );
  }
  // until they say they bring their own lunch, and until a travel pass spares the day pass,
  // everybody counts with both
  const withLunch = !isFieldName(field.lunchField) || lunchAnswer !== WITHOUT_LUNCH;
  const passes = isFieldName(field.travelPassField)
    ? travelPassAnswers
        .slice(0, persons)
        .map((answer) => (typeof answer === 'string' ? answer : ''))
    : [];
  const fullPackage = calculateVisitDayBill(
    { persons, withLunch, travelPasses: [] },
    priceList,
    locale,
  );
  const bill = calculateVisitDayBill(
    { persons, withLunch, travelPasses: passes },
    priceList,
    locale,
  );
  const saving = fullPackage.netTotal - bill.netTotal;
  const sparedRailTickets =
    priceList.railTicket > 0 ? Math.round(saving / priceList.railTicket) : 0;

  return (
    <aside aria-live="polite" className="flex flex-col gap-2">
      <SectionLabel>{titleText[locale]}</SectionLabel>
      <Card divided>
        <ul className="flex flex-col gap-2 px-5 py-4">
          {fullPackage.lines.map((line) => (
            <SummaryRow
              key={line.label}
              quantity={line.quantity}
              label={line.label}
              amount={formatChf(line.amount)}
            />
          ))}
          {saving > 0 && (
            <SummaryRow
              quantity={sparedRailTickets}
              label={withoutRailTicketText[locale]}
              amount={`− ${formatChf(saving)}`}
              isSaving
            />
          )}
          {bill.vatRate > 0 && (
            <li className="flex items-baseline justify-between gap-4 text-[15px] text-green-700">
              <span>{vatText(bill.vatRate, locale)}</span>
              <span className="shrink-0 tabular-nums">{formatChf(bill.vatAmount)}</span>
            </li>
          )}
        </ul>
        <div className="px-5 py-4">
          <p className="flex items-baseline justify-between gap-4">
            <span className="text-heading font-heading text-base font-extrabold">
              {totalText[locale]}
            </span>
            <span className="text-heading font-heading text-lg font-extrabold whitespace-nowrap tabular-nums">
              {formatChf(bill.total)}
            </span>
          </p>
        </div>
      </Card>
      <div className="bg-quiet flex gap-2 rounded-[14px] px-4 py-3 text-[14px] text-green-700">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="flex flex-col gap-1">
          {isFieldName(field.travelPassField) && (
            <p className="text-pretty">{railTicketHint[locale]}</p>
          )}
          <p className="text-pretty">{billHint[locale]}</p>
        </div>
      </div>
    </aside>
  );
};
