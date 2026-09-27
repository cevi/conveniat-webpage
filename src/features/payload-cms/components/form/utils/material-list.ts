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

/** Whether a quantity is one a material list takes: a whole number from 0 to the maximum. */
export const isAllowedQuantity = (quantity: number): boolean =>
  Number.isInteger(quantity) && quantity >= 0 && quantity <= MATERIAL_LIST_MAX_QUANTITY;
