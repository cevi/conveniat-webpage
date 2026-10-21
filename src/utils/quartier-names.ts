/**
 * How the camp writes its Quartiere: "Quartier 5 - Greif" in the CMS, "Q5" on a chip, "Greif"
 * next to the number, "Q4–Q6" for a run of them.
 */

/** The number of a Quartier named the usual way, "Quartier 3 - Nord" -> 3. */
export const quartierNumberOf = (name: string | undefined): number | undefined => {
  const number = /^Quartier\s+(\d+)/i.exec(name ?? '')?.[1];
  return number === undefined ? undefined : Number(number);
};

/**
 * "Quartier 3 - Nord" is too long for a chip, so a Quartier named that way shows as "Q3". Any
 * other name is shown as the editors wrote it.
 */
export const shortQuartierName = (name: string | undefined): string => {
  const number = quartierNumberOf(name);
  return number === undefined ? (name ?? '') : `Q${number}`;
};

/** "Quartier 3 - Nord" -> "Nord", the name people use next to the number. */
export const quartierNicknameOf = (name: string | undefined): string =>
  (name ?? '').replace(/^Quartier\s+\d+\s*[-–]\s*/i, '');

/**
 * Several Quartiere in a few characters: consecutive numbers as a range, "Q4–Q6" or "Q7–Q8",
 * the others listed, "Q1, Q3". Quartiere without a number keep their name.
 */
export const formatQuartierRange = (names: readonly (string | undefined)[]): string => {
  const numbers = [...new Set(names.map((name) => quartierNumberOf(name)))]
    .filter((number): number is number => number !== undefined)
    .sort((x, y) => x - y);
  const runs: string[] = [];
  for (let index = 0; index < numbers.length; index++) {
    const first = numbers[index] as number;
    let last = first;
    while (numbers[index + 1] === last + 1) last = numbers[++index] as number;
    runs.push(last === first ? `Q${first}` : `Q${first}–Q${last}`);
  }
  const unnumbered = names.filter(
    (name) => quartierNumberOf(name) === undefined && name !== undefined,
  );
  return [...runs, ...unnumbered].join(', ');
};
