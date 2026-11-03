import { toRappen } from '@/features/billing-core/money';
import type { Locale } from '@/types/types';

/** What a Besuchstag ticket costs, from the Besuchstag bill settings. */
export interface VisitDayPrices {
  /** per person, VAT included */
  withLunch: number;
  /** per person, VAT included */
  withoutLunch: number;
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
  /** VAT included */
  total: number;
  /** the VAT the total includes, 0 without VAT */
  vatAmount: number;
  vatRate: number;
}

const lineLabel: Record<'withLunch' | 'withoutLunch', Record<Locale, string>> = {
  withLunch: {
    de: 'Besuchstag mit Mittagessen',
    fr: 'Journée des visites avec repas de midi',
    en: 'Visiting day with lunch',
  },
  withoutLunch: {
    de: 'Besuchstag ohne Mittagessen',
    fr: 'Journée des visites sans repas de midi',
    en: 'Visiting day without lunch',
  },
};

/**
 * What a registration costs: one ticket per person, priced by whether they eat lunch at the
 * camp. Prices include VAT, so the VAT is taken out of the total at the one rate the settings
 * name, rounded to the Rappen.
 */
export const calculateVisitDayBill = (
  registration: { persons: number; withLunch: boolean },
  prices: VisitDayPrices,
  locale: Locale,
): VisitDayBillAmount => {
  const kind = registration.withLunch ? 'withLunch' : 'withoutLunch';
  const unitPrice = prices[kind];
  const totalRappen = toRappen(unitPrice) * registration.persons;
  const vatRappen =
    prices.vatRate > 0 ? Math.round((totalRappen * prices.vatRate) / (100 + prices.vatRate)) : 0;
  return {
    lines: [
      {
        label: lineLabel[kind][locale],
        quantity: registration.persons,
        unitPrice,
        amount: totalRappen / 100,
      },
    ],
    total: totalRappen / 100,
    vatAmount: vatRappen / 100,
    vatRate: prices.vatRate,
  };
};
