/**
 * Blocks that render a grid of cards and therefore need the wide column of a split
 * section, unless the editor placed them explicitly.
 */
const MAIN_COLUMN_BLOCK_TYPES = new Set(['jobSelection', 'dateSlotSelection']);

/** Column a field ends up in when the section uses the split layout. */
export const getEffectivePlacement = (field: {
  blockType?: string;
  placement?: 'sidebar' | 'main';
}): 'sidebar' | 'main' =>
  field.placement ??
  (field.blockType !== undefined && MAIN_COLUMN_BLOCK_TYPES.has(field.blockType)
    ? 'main'
    : 'sidebar');
