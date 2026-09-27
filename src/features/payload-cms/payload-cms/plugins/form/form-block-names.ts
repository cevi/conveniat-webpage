/**
 * The names of every field of one block type in a form section, including those inside a
 * conditioned block.
 */
export const getFormBlockNames = (
  fields: unknown[] | null | undefined,
  blockType: string,
): string[] => {
  if (!Array.isArray(fields)) return [];
  return fields.flatMap((field): string[] => {
    if (field === null || typeof field !== 'object') return [];
    const block = field as { blockType?: string; name?: string; fields?: unknown[] | null };
    if (block.blockType === blockType && typeof block.name === 'string') return [block.name];
    if (block.blockType === 'conditionedBlock') return getFormBlockNames(block.fields, blockType);
    return [];
  });
};
