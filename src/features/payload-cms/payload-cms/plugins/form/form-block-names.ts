/**
 * Every block of one type in a form section, including those inside a conditioned block.
 */
export const getFormBlocks = (
  fields: unknown[] | null | undefined,
  blockType: string,
): Record<string, unknown>[] => {
  if (!Array.isArray(fields)) return [];
  return fields.flatMap((field): Record<string, unknown>[] => {
    if (field === null || typeof field !== 'object') return [];
    const block = field as { blockType?: string; name?: string; fields?: unknown[] | null };
    if (block.blockType === blockType && typeof block.name === 'string') {
      return [block];
    }
    if (block.blockType === 'conditionedBlock') return getFormBlocks(block.fields, blockType);
    return [];
  });
};

/**
 * The names of every field of one block type in a form section, including those inside a
 * conditioned block.
 */
export const getFormBlockNames = (
  fields: unknown[] | null | undefined,
  blockType: string,
): string[] => getFormBlocks(fields, blockType).map((block) => block['name'] as string);
