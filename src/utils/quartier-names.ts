/**
 * How the camp writes its Quartiere: "Quartier 5 - Greif" as the full name, "Q5" on a chip,
 * "Greif" as the Rufname, "Q4–Q6" for a run of them. All of it comes from the Quartier's own
 * fields; a Quartier read from an older copy, or one the editors have not numbered yet, shows
 * its full name instead.
 */

/** A Quartier as the app receives it: every field may be missing in a copy stored on a phone. */
export interface QuartierLabel {
  name?: string | null | undefined;
  number?: number | null | undefined;
  rufname?: string | null | undefined;
}

const numberOf = (quartier: QuartierLabel): number | undefined =>
  typeof quartier.number === 'number' ? quartier.number : undefined;

/** "Q5", or the full name of a Quartier without a number. */
export const shortQuartierName = (quartier: QuartierLabel): string => {
  const number = numberOf(quartier);
  return number === undefined ? (quartier.name ?? '') : `Q${number}`;
};

/** "Greif", the name people call the Quartier by, or its full name while it has none. */
export const quartierRufnameOf = (quartier: QuartierLabel): string =>
  typeof quartier.rufname === 'string' && quartier.rufname !== ''
    ? quartier.rufname
    : (quartier.name ?? '');

/** The order of the Quartiere by number; one without a number comes last. */
export const quartierOrderOf = (quartier: QuartierLabel): number =>
  numberOf(quartier) ?? Number.POSITIVE_INFINITY;

/**
 * Several Quartiere in a few characters: consecutive numbers as a range, "Q4–Q6" or "Q7–Q8",
 * the others listed, "Q1, Q3". Quartiere without a number keep their name.
 */
export const formatQuartierRange = (quartiere: readonly QuartierLabel[]): string => {
  const numbers = [
    ...new Set(quartiere.map((quartier) => numberOf(quartier)).filter((n) => n !== undefined)),
  ].sort((x, y) => x - y);
  const runs: string[] = [];
  for (let index = 0; index < numbers.length; index++) {
    const first = numbers[index] as number;
    let last = first;
    while (numbers[index + 1] === last + 1) last = numbers[++index] as number;
    runs.push(last === first ? `Q${first}` : `Q${first}–Q${last}`);
  }
  const unnumbered = quartiere
    .filter((quartier) => numberOf(quartier) === undefined)
    .map((quartier) => quartier.name ?? '')
    .filter((name) => name !== '');
  return [...runs, ...unnumbered].join(', ');
};
