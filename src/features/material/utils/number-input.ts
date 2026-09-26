/**
 * Reads what somebody typed into a number field. An empty or unreadable text gives
 * `undefined`, so the field can be cleared while typing; anything else is rounded down and
 * kept inside `[min, max]`.
 */
export const parseNumberDraft = (text: string, min: number, max: number): number | undefined => {
  if (text.trim() === '') return undefined;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(Math.max(Math.floor(parsed), min), Math.max(max, min));
};
