import { toRappen } from '@/features/billing-core/money';
import { needsRailTicket } from '@/features/visit-day/visit-day-choices';
import type { Locale } from '@/types/types';

/**
 * What a Besuchstag ticket is made of, from the Besuchstag bill settings. Every price is per
 * person and without VAT, which the bill adds on top.
 */
export interface VisitDayPrices {
  /** the entry to the Lagerplatz, paid by everybody */
  entryFee: number;
  /** paid by everybody who has lunch at the camp */
  lunchFee: number;
  /** the SBB day pass, paid by everybody who travels without a GA and is 6 or older */
  railTicket: number;
  /** in percent, the same for every bill; 0 for none */
  vatRate: number;
}

/** One line of a Besuchstag bill. */
export interface VisitDayBillLine {
  label: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface VisitDayBillAmount {
  lines: VisitDayBillLine[];
  /** what the lines add up to, without VAT */
  netTotal: number;
  /** what is paid: the lines plus VAT */
  total: number;
  /** the VAT added to the lines, 0 without VAT */
  vatAmount: number;
  vatRate: number;
}

type LineKind = 'entry' | 'lunch' | 'railTicket';

const lineLabel: Record<LineKind, Record<Locale, string>> = {
  entry: {
    de: 'Eintritt Lagerplatz',
    fr: 'Entrée sur le terrain du camp',
    en: 'Entry to the campsite',
  },
  lunch: {
    de: 'Mittagessen im Lager',
    fr: 'Repas de midi au camp',
    en: 'Lunch at the camp',
  },
  railTicket: {
    de: 'SBB-Tageskarte (vergünstigt, ganze Schweiz)',
    fr: 'Carte journalière CFF (à prix réduit, toute la Suisse)',
    en: 'SBB day pass (discounted, all of Switzerland)',
  },
};

/** What a registration is billed for, before it is priced. */
export interface VisitDayRegistrationItems {
  persons: number;
  withLunch: boolean;
  /**
   * The travel pass of each person, e.g. `['halbtax', 'ga']`. A person without an entry gets a
   * rail ticket.
   */
  travelPasses: readonly string[];
}

/** How many of each line a registration takes. */
export const countVisitDayItems = (
  registration: VisitDayRegistrationItems,
): Record<LineKind, number> => {
  const railTickets = Array.from({ length: registration.persons }, (_, index) =>
    needsRailTicket(registration.travelPasses[index]),
  ).filter(Boolean).length;
  return {
    entry: registration.persons,
    lunch: registration.withLunch ? registration.persons : 0,
    railTicket: railTickets,
  };
};

const unitPriceOf = (kind: LineKind, prices: VisitDayPrices): number =>
  ({ entry: prices.entryFee, lunch: prices.lunchFee, railTicket: prices.railTicket })[kind];

/**
 * What a registration costs: the entry for every person, lunch for every person when they eat
 * at the camp, and an SBB day pass for every person who needs one. Prices are without VAT, so
 * the VAT is added on top at the one rate the settings name, rounded to the Rappen.
 */
export const calculateVisitDayBill = (
  registration: VisitDayRegistrationItems,
  prices: VisitDayPrices,
  locale: Locale,
): VisitDayBillAmount => {
  const counts = countVisitDayItems(registration);
  const lines = (['entry', 'lunch', 'railTicket'] as const)
    .filter((kind) => counts[kind] > 0)
    .map((kind) => {
      const unitPrice = unitPriceOf(kind, prices);
      return {
        label: lineLabel[kind][locale],
        quantity: counts[kind],
        unitPrice,
        amount: (toRappen(unitPrice) * counts[kind]) / 100,
      };
    });
  const netRappen = lines.reduce((sum, line) => sum + toRappen(line.amount), 0);
  const vatRappen = prices.vatRate > 0 ? Math.round((netRappen * prices.vatRate) / 100) : 0;
  return {
    lines,
    netTotal: netRappen / 100,
    total: (netRappen + vatRappen) / 100,
    vatAmount: vatRappen / 100,
    vatRate: prices.vatRate,
  };
};

/** The prices of the saved Besuchstag bill settings. */
export const visitDayPricesOf = (settings: {
  entryFee: number;
  lunchFee: number;
  railTicketPrice: number;
  vatRate: number;
}): VisitDayPrices => ({
  entryFee: settings.entryFee,
  lunchFee: settings.lunchFee,
  railTicket: settings.railTicketPrice,
  vatRate: settings.vatRate,
});
