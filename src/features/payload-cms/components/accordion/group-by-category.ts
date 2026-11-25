/** The entries of one category, or of none when `name` is undefined. */
export interface CategoryGroup<T> {
  name: string | undefined;
  entries: T[];
}

/**
 * Groups accordion entries by the name of their category, in the order the editor placed the
 * first entry of each, so the editor decides the order of the groups and of the filters. The
 * entries without a category come last, in a group of their own.
 */
export const groupByCategory = <T extends { id?: string | null }>(
  entries: readonly T[],
  categoryNames: Readonly<Record<string, string>>,
): CategoryGroup<T>[] => {
  const groups = new Map<string, T[]>();
  const uncategorized: T[] = [];
  for (const entry of entries) {
    const name = entry.id === undefined || entry.id === null ? undefined : categoryNames[entry.id];
    if (name === undefined) {
      uncategorized.push(entry);
      continue;
    }
    const group = groups.get(name);
    if (group === undefined) groups.set(name, [entry]);
    else group.push(entry);
  }

  return [
    ...[...groups].map(([name, groupEntries]) => ({ name, entries: groupEntries })),
    ...(uncategorized.length === 0 ? [] : [{ name: undefined, entries: uncategorized }]),
  ];
};
