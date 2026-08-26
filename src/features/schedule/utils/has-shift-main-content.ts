/**
 * Whether a shift carries a detailed description worth a section of its own.
 *
 * A block list is not enough to go on: an empty rich-text block is still a block, and rendering
 * the section for one puts a heading over nothing.
 */
export function hasShiftMainContent(mainContent?: unknown): boolean {
  if (!Array.isArray(mainContent) || mainContent.length === 0) {
    return false;
  }

  return mainContent.some((block) => {
    if (block === null || block === undefined || typeof block !== 'object') {
      return false;
    }
    const b = block as Record<string, unknown>;

    if (b['blockType'] === 'richTextSection') {
      const section =
        typeof b['richTextSection'] === 'object' && b['richTextSection'] !== null
          ? (b['richTextSection'] as Record<string, unknown>)
          : undefined;
      const root =
        typeof section?.['root'] === 'object' && section['root'] !== null
          ? (section['root'] as Record<string, unknown>)
          : undefined;
      if (root === undefined) {
        return false;
      }

      const hasTextNode = (node: unknown): boolean => {
        if (node === null || node === undefined || typeof node !== 'object') {
          return false;
        }
        const n = node as Record<string, unknown>;
        if (typeof n['text'] === 'string' && n['text'].trim().length > 0) {
          return true;
        }
        if (Array.isArray(n['children'])) {
          return n['children'].some((childItem) => hasTextNode(childItem));
        }
        return false;
      };

      return hasTextNode(root);
    }

    return true;
  });
}
