/** Most of one material a material list takes. */
export const MATERIAL_LIST_MAX_QUANTITY = 10_000;

/** One ordered material, as a material list stores its answer. */
export interface MaterialLine {
  /** The id of the list's line, stable across languages and renames. */
  id: string;
  /** The name the line had when it was ordered, in German, set by the server. */
  name?: string;
  section?: string;
  quantity: number;
}

const isMaterialLine = (value: unknown): value is MaterialLine => {
  if (typeof value !== 'object' || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line['id'] === 'string' &&
    typeof line['quantity'] === 'number' &&
    (line['name'] === undefined || typeof line['name'] === 'string') &&
    (line['section'] === undefined || typeof line['section'] === 'string')
  );
};

/**
 * The lines of a material list's answer, or undefined when it is not one. The answer is text
 * like every form answer: a JSON list of the ordered lines, only those with a quantity.
 */
export const parseMaterialAnswer = (value: unknown): MaterialLine[] | undefined => {
  if (typeof value !== 'string' || value.trim() === '') return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) && parsed.every((line) => isMaterialLine(line))
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
};

/** The answer text for the given lines; lines without a quantity are left out. */
export const serializeMaterialAnswer = (lines: readonly MaterialLine[]): string => {
  const ordered = lines.filter((line) => line.quantity > 0);
  return ordered.length === 0 ? '' : JSON.stringify(ordered);
};

/**
 * The step a line is ordered in, e.g. 10 for Zelttücher that are handed out in bundles of ten.
 * A line without one, or with one a draft let through, is ordered one by one.
 */
export const materialStep = (step: unknown): number =>
  typeof step === 'number' && Number.isInteger(step) && step >= 1 ? step : 1;

/**
 * Whether a quantity is one a material list takes: a whole multiple of the line's step, from 0
 * to the maximum.
 */
export const isAllowedQuantity = (quantity: number, step: unknown = 1): boolean =>
  Number.isInteger(quantity) &&
  quantity >= 0 &&
  quantity <= MATERIAL_LIST_MAX_QUANTITY &&
  quantity % materialStep(step) === 0;

/**
 * The quantity one step up or down from the given one, on the line's steps: 7 in steps of 5
 * goes up to 10 and down to 5, never past 0 or the most the line takes.
 */
export const stepQuantity = (quantity: number, step: unknown, direction: 1 | -1): number => {
  const size = materialStep(step);
  const next =
    direction === 1
      ? (Math.floor(quantity / size) + 1) * size
      : (Math.ceil(quantity / size) - 1) * size;
  const most = Math.floor(MATERIAL_LIST_MAX_QUANTITY / size) * size;
  return Math.min(most, Math.max(0, next));
};
