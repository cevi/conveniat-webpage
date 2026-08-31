/**
 * VAT (MWST) calculation for camp bills.
 *
 * Two rules from the Swiss VAT regime drive everything in here:
 *
 * 1. **A single camp fee can carry more than one rate.** Part of the fee is accommodation
 *    (Beherbergung, currently 3.8%) and part of it is a normal supply (currently 8.1%), so
 *    the net amount is split into shares that are each taxed at their own rate. The split
 *    is configured per role in the `bill-settings` global; a role without splits keeps the
 *    single `vatCode` it has always had.
 *
 * 2. **Young participants are exempt.** Per Branchen-Info 24, Ziff. 18.4 a participant
 *    counts as under-age until the *end of the calendar year* in which they reach the age
 *    limit — someone turning 18 in 2027 still counts as under 18 for all of 2027. Which
 *    year that test runs against is a judgement call (the VAT debt arises when the bill is
 *    raised, but the supply is the camp), so it is configurable rather than hard-coded.
 *
 * The module is deliberately free of Payload and PDF imports so the arithmetic can be
 * tested on its own.
 */

/** One rate applied to a share of the net amount, as configured per role. */
export interface VatSplitConfig {
  label?: string | null;
  /** Share of the net amount, in percent. Shares are normalised, so 50/50 and 1/1 agree. */
  share?: number | null;
  /** Rate as written by an operator: `3.8`, `3.8%` or `3,8%` all parse. */
  vatCode?: string | null;
}

/** Which year the youth exemption is tested against. */
export type VatReferenceYearMode = 'invoiceYear' | 'fixedYear';

/** Youth exemption rule, as configured in the `bill-settings` global. */
export interface VatExemptionConfig {
  enabled?: boolean | null;
  /** Age reached during the reference year that still counts as under-age. */
  maxAge?: number | null;
  referenceYearMode?: VatReferenceYearMode | null;
  /** Used when `referenceYearMode` is `fixedYear` — typically the camp year. */
  fixedReferenceYear?: number | null;
}

/** One line of the VAT breakdown, as printed on the invoice and booked in the export. */
export interface VatComponent {
  label: string;
  /** Normalised share of the net amount, in percent. */
  share: number;
  /** The slice of the net amount this rate applies to. */
  netAmount: number;
  vatRate: number;
  /** The rate as it should read on the invoice, e.g. `8.1%`. */
  formattedVatCode: string;
  vatAmount: number;
}

export interface VatCalculation {
  /** True when the youth exemption applied and no VAT is owed. */
  isExempt: boolean;
  netAmount: number;
  /** Sum of the component VAT amounts. */
  vatAmount: number;
  /** What the debtor pays, and what goes into the QR bill. */
  totalAmount: number;
  components: VatComponent[];
}

interface ResolvedVatExemption {
  enabled: boolean;
  maxAge: number;
  referenceYearMode: VatReferenceYearMode;
  fixedReferenceYear: number;
}

export const DEFAULT_VAT_EXEMPTION: ResolvedVatExemption = {
  enabled: true,
  maxAge: 18,
  referenceYearMode: 'invoiceYear',
  fixedReferenceYear: 2027,
};

/** Rounds to whole cents, half away from zero, without the usual binary-float surprises. */
const roundToCents = (value: number): number =>
  Math.round((value + Number.EPSILON * Math.sign(value)) * 100) / 100;

/**
 * Parses a rate an operator typed into the settings. Anything unparseable is treated as 0%,
 * which is the safe direction: it under-charges rather than inventing a tax.
 */
export const parseVatRate = (vatCode: string | null | undefined): number => {
  if (typeof vatCode !== 'string') return 0;
  const parsed = Number.parseFloat(vatCode.replace('%', '').replace(',', '.').trim());
  return Number.isNaN(parsed) ? 0 : parsed;
};

/** Normalises a rate for display, so `8.1` and `8.1%` both print as `8.1%`. */
export const formatVatCode = (vatCode: string | null | undefined): string => {
  const raw = typeof vatCode === 'string' ? vatCode.trim() : '';
  if (raw === '') return '0.0%';
  const normalised = raw.replace(',', '.');
  return normalised.endsWith('%') ? normalised : `${normalised}%`;
};

/**
 * Pulls the birth year out of whatever Cevi.DB returned. Hitobito serves ISO dates
 * (`2009-04-17`), but the field is free text upstream, so the first four-digit run wins.
 */
export const parseBirthYear = (birthday: string | null | undefined): number | undefined => {
  if (typeof birthday !== 'string' || birthday.trim() === '') return undefined;
  const match = /\d{4}/.exec(birthday);
  if (match === null) return undefined;
  const year = Number.parseInt(match[0], 10);
  return Number.isNaN(year) ? undefined : year;
};

/** The year the youth exemption is tested against, per the configured mode. */
export const resolveReferenceYear = (
  exemption: VatExemptionConfig | null | undefined,
  invoiceDate: Date = new Date(),
): number => {
  const mode = exemption?.referenceYearMode ?? DEFAULT_VAT_EXEMPTION.referenceYearMode;
  if (mode === 'fixedYear') {
    const fixed = exemption?.fixedReferenceYear;
    if (typeof fixed === 'number' && Number.isFinite(fixed)) return Math.trunc(fixed);
    return DEFAULT_VAT_EXEMPTION.fixedReferenceYear;
  }
  return invoiceDate.getFullYear();
};

/**
 * Whether the youth exemption applies.
 *
 * A participant stays exempt through the whole calendar year in which they reach the age
 * limit, so the test is `referenceYear <= birthYear + maxAge`. With the default limit of
 * 18, someone born in 2009 is exempt for a bill referenced to 2027 and taxed from 2028.
 *
 * A participant with no birthday on file is treated as taxable — the conservative side,
 * since charging VAT that was not owed is a correction, while omitting it is a debt.
 */
export const isVatExempt = (
  birthday: string | null | undefined,
  exemption: VatExemptionConfig | null | undefined,
  invoiceDate: Date = new Date(),
): boolean => {
  if ((exemption?.enabled ?? DEFAULT_VAT_EXEMPTION.enabled) === false) return false;

  const birthYear = parseBirthYear(birthday);
  if (birthYear === undefined) return false;

  const rawMaxAge = exemption?.maxAge;
  const maxAge =
    typeof rawMaxAge === 'number' && Number.isFinite(rawMaxAge)
      ? Math.trunc(rawMaxAge)
      : DEFAULT_VAT_EXEMPTION.maxAge;

  return resolveReferenceYear(exemption, invoiceDate) <= birthYear + maxAge;
};

/**
 * Turns the configured splits into the list the calculation works on.
 *
 * A role that has no splits configured falls back to its single `vatCode` at the full
 * amount, which is what every role looked like before splits existed.
 */
export const resolveVatSplits = (
  vatSplits: VatSplitConfig[] | null | undefined,
  fallbackVatCode: string | null | undefined,
): VatSplitConfig[] => {
  const usable = (vatSplits ?? []).filter(
    (split) => typeof split.share === 'number' && Number.isFinite(split.share) && split.share > 0,
  );
  if (usable.length > 0) return usable;
  return [{ share: 100, vatCode: fallbackVatCode ?? '' }];
};

/** The sum of the configured shares, used to normalise them into percentages. */
export const sumVatShares = (vatSplits: VatSplitConfig[] | null | undefined): number =>
  (vatSplits ?? []).reduce(
    (total, split) => total + (typeof split.share === 'number' ? split.share : 0),
    0,
  );

export interface CalculateVatParameters {
  netAmount: number;
  vatSplits?: VatSplitConfig[] | null | undefined;
  /** Used when no splits are configured. */
  vatCode?: string | null | undefined;
  birthday?: string | null | undefined;
  exemption?: VatExemptionConfig | null | undefined;
  /** The day the bill is raised — the reference point for `invoiceYear` mode. */
  invoiceDate?: Date;
}

/**
 * Splits a net camp fee across its VAT rates and totals it up.
 *
 * The net slices are rounded to cents and the last slice absorbs the rounding residual, so
 * the slices always add back up to the net amount an operator configured. Each slice's VAT
 * is rounded on its own, matching how the amounts are printed and booked line by line.
 */
export const calculateVat = ({
  netAmount,
  vatSplits,
  vatCode,
  birthday,
  exemption,
  invoiceDate = new Date(),
}: CalculateVatParameters): VatCalculation => {
  const net = Number.isFinite(netAmount) ? roundToCents(netAmount) : 0;
  const isExempt = isVatExempt(birthday, exemption, invoiceDate);
  const splits = resolveVatSplits(vatSplits, vatCode);
  const shareTotal = sumVatShares(splits);

  const components: VatComponent[] = [];
  let allocatedNet = 0;

  for (const [index, split] of splits.entries()) {
    const isLast = index === splits.length - 1;
    const rawShare = typeof split.share === 'number' ? split.share : 0;
    const share = shareTotal > 0 ? (rawShare / shareTotal) * 100 : 0;

    // The last slice takes the remainder so the slices reconstruct the net amount exactly.
    const componentNet = isLast
      ? roundToCents(net - allocatedNet)
      : roundToCents((net * share) / 100);
    allocatedNet = roundToCents(allocatedNet + componentNet);

    const vatRate = isExempt ? 0 : parseVatRate(split.vatCode);
    const label = typeof split.label === 'string' && split.label.trim() !== '' ? split.label : '';

    components.push({
      label,
      share: roundToCents(share),
      netAmount: componentNet,
      vatRate,
      formattedVatCode: isExempt ? '0.0%' : formatVatCode(split.vatCode),
      vatAmount: roundToCents((componentNet * vatRate) / 100),
    });
  }

  const vatAmount = roundToCents(
    components.reduce((total, component) => total + component.vatAmount, 0),
  );

  return {
    isExempt,
    netAmount: net,
    vatAmount,
    totalAmount: roundToCents(net + vatAmount),
    components,
  };
};

/**
 * The label printed next to a VAT line on the invoice.
 *
 * Exempt bills carry the reason rather than a bare `MWST 0.0%`, because the participant
 * (and their parents) invariably ask why the rate is zero.
 */
export const formatVatLineLabel = (component: VatComponent, isExempt: boolean): string => {
  if (isExempt) return 'MWST 0.0% (steuerbefreite Leistung an Jugendliche)';
  const suffix = component.label === '' ? '' : ` (${component.label})`;
  return `MWST ${component.formattedVatCode}${suffix}`;
};
