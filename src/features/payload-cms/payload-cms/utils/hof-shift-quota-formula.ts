/**
 * How "Neu verteilen" spreads the places of each camp day over the Höfe. Pure, so the quota
 * grid shows the result as a preview before anything is saved.
 */

/** A camp day as `YYYY-MM-DD`, in Zurich. */
type CampDay = string;

export interface QuotaDistributionSettings {
  /** percent of the places of a day the quotas cover; above 100 plans a reserve */
  coveragePercent: number;
  /** a Hof weighs its Leitende to this power, in hundredths: 100 is strictly proportional */
  weightingPercent: number;
  /** at most this percent of the Leitende of a Hof on one day */
  maxPerDayPercent: number;
}

export const DEFAULT_DISTRIBUTION_SETTINGS: QuotaDistributionSettings = {
  coveragePercent: 100,
  weightingPercent: 80,
  maxPerDayPercent: 30,
};

export interface QuotaDistributionInput {
  /** in order, since a Hof rounded down on one day is rounded up first on a later one */
  days: readonly CampDay[];
  hoefe: readonly { id: string; leaders: number }[];
  /** the places of all Schichteinsätze of a day */
  placesPerDay: Readonly<Record<CampDay, number>>;
  /** cells typed in by hand, `hofId → day → slots`; the rest of the day goes around them */
  pinned: Readonly<Record<string, Readonly<Record<CampDay, number>>>>;
  settings: QuotaDistributionSettings;
}

/**
 * Splits `target` over the weights, but never more than a Hof's cap: what a capped Hof cannot
 * take goes to the others, in proportion to their weights, until nothing is left or every Hof
 * is full.
 */
const fillUpToCaps = (target: number, weights: number[], caps: number[]): number[] => {
  const shares = weights.map(() => 0);
  const open = new Set(weights.flatMap((weight, index) => (weight > 0 ? [index] : [])));
  let left = target;
  while (left > 1e-9 && open.size > 0) {
    const weightOfOpen = [...open].reduce((sum, index) => sum + (weights[index] ?? 0), 0);
    let spilled = 0;
    for (const index of open) {
      const want = (left * (weights[index] ?? 0)) / weightOfOpen;
      const room = (caps[index] ?? 0) - (shares[index] ?? 0);
      if (want >= room) {
        shares[index] = caps[index] ?? 0;
        open.delete(index);
        spilled += want - room;
      } else {
        shares[index] = (shares[index] ?? 0) + want;
      }
    }
    left = spilled;
  }
  return shares;
};

/**
 * The quota of every Hof on every day, `hofId → day → slots`.
 *
 * Per day, the places to cover (the coverage of the day's places, less the pinned cells) are
 * split by weight, a Hof's Leitende to the power of the weighting, and capped at the most a Hof
 * gives on one day. The shares are rounded to whole Einsätze so the day adds up, and what a Hof
 * gained or lost by rounding is carried to its next day: over the camp every Hof stays within
 * one Einsatz of its fair share. A pinned cell is kept as it is, a pinned 0 included, which
 * says the Hof is not there that day.
 */
export const distributeQuotas = ({
  days,
  hoefe,
  placesPerDay,
  pinned,
  settings,
}: QuotaDistributionInput): Record<string, Record<CampDay, number>> => {
  const exponent = settings.weightingPercent / 100;
  const result: Record<string, Record<CampDay, number>> = Object.fromEntries(
    hoefe.map((hof) => [hof.id, {}]),
  );
  // what rounding took from a Hof so far, positive when it gave less than its share
  const carry = new Map(hoefe.map((hof) => [hof.id, 0]));

  for (const day of days) {
    const free = hoefe.filter((hof) => pinned[hof.id]?.[day] === undefined);
    let pinnedOfDay = 0;
    for (const hof of hoefe) {
      const value = pinned[hof.id]?.[day];
      if (value === undefined) continue;
      pinnedOfDay += value;
      (result[hof.id] ??= {})[day] = value;
    }

    const caps = free.map((hof) =>
      Math.floor((hof.leaders * settings.maxPerDayPercent) / 100 + 1e-9),
    );
    const capacity = caps.reduce((sum, cap) => sum + cap, 0);
    const places = placesPerDay[day] ?? 0;
    const target = Math.min(
      capacity,
      Math.max(0, Math.round((places * settings.coveragePercent) / 100) - pinnedOfDay),
    );
    const weights = free.map((hof) => (hof.leaders > 0 ? hof.leaders ** exponent : 0));
    const shares = fillUpToCaps(target, weights, caps);

    // round down, then hand the Einsätze still missing to the largest remainders, carry
    // included, among the Höfe below their cap
    const owed = free.map((hof, index) => (shares[index] ?? 0) + (carry.get(hof.id) ?? 0));
    const slots = owed.map((value, index) =>
      Math.min(caps[index] ?? 0, Math.max(0, Math.floor(value))),
    );
    let missing = target - slots.reduce((sum, value) => sum + value, 0);
    const byRemainder = free
      .map((_hof, index) => index)
      .filter((index) => (weights[index] ?? 0) > 0)
      .toSorted((a, b) => {
        const remainderOrder =
          (owed[b] ?? 0) - (slots[b] ?? 0) - ((owed[a] ?? 0) - (slots[a] ?? 0));
        return remainderOrder === 0 ? (weights[b] ?? 0) - (weights[a] ?? 0) : remainderOrder;
      });
    while (missing > 0) {
      const next = byRemainder.find((index) => (slots[index] ?? 0) < (caps[index] ?? 0));
      if (next === undefined) break;
      slots[next] = (slots[next] ?? 0) + 1;
      byRemainder.splice(byRemainder.indexOf(next), 1);
      byRemainder.push(next);
      missing -= 1;
    }
    // a carry above what a later day can repay would grow without end; keep it to a few
    for (const [index, hof] of free.entries()) {
      (result[hof.id] ??= {})[day] = slots[index] ?? 0;
      const left = (owed[index] ?? 0) - (slots[index] ?? 0);
      carry.set(hof.id, Math.max(-2, Math.min(2, left)));
    }
  }
  return result;
};
