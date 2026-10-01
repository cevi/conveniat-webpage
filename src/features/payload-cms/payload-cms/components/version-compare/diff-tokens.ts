/** Above this many table cells the middle of the two lists is reported as fully changed. */
const MAX_TABLE_CELLS = 4_000_000;

export interface TokenDiff {
  /** Indices into `before` of the tokens that are gone. */
  removed: number[];
  /** Indices into `after` of the tokens that are new. */
  added: number[];
}

/**
 * Compares two token lists and reports what was removed and what was added, keeping the longest
 * common subsequence as unchanged. Used word by word on the text of a rendered block.
 */
export const diffTokens = (before: string[], after: string[]): TokenDiff => {
  // Edits are usually local, so most of both lists drops out here and the table stays small.
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) {
    start++;
  }
  let endBefore = before.length;
  let endAfter = after.length;
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore--;
    endAfter--;
  }

  const rows = endBefore - start;
  const columns = endAfter - start;
  const removed: number[] = [];
  const added: number[] = [];

  if (rows * columns > MAX_TABLE_CELLS) {
    for (let index = start; index < endBefore; index++) removed.push(index);
    for (let index = start; index < endAfter; index++) added.push(index);
    return { removed, added };
  }

  // common[row * width + column] is the length of the longest common subsequence of
  // before[start + row ..] and after[start + column ..]
  const width = columns + 1;
  const common = new Uint32Array((rows + 1) * width);
  for (let row = rows - 1; row >= 0; row--) {
    for (let column = columns - 1; column >= 0; column--) {
      common[row * width + column] =
        before[start + row] === after[start + column]
          ? (common[(row + 1) * width + column + 1] ?? 0) + 1
          : Math.max(
              common[(row + 1) * width + column] ?? 0,
              common[row * width + column + 1] ?? 0,
            );
    }
  }

  let row = 0;
  let column = 0;
  while (row < rows && column < columns) {
    if (before[start + row] === after[start + column]) {
      row++;
      column++;
    } else if (
      (common[(row + 1) * width + column] ?? 0) >= (common[row * width + column + 1] ?? 0)
    ) {
      removed.push(start + row++);
    } else {
      added.push(start + column++);
    }
  }
  while (row < rows) removed.push(start + row++);
  while (column < columns) added.push(start + column++);

  return { removed, added };
};
