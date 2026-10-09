/** A place that shows the same content in both panes, as a scroll offset in each. */
export interface ScrollAnchor {
  from: number;
  to: number;
}

/**
 * The longest run of items whose position only ever increases.
 *
 * Blocks can be reordered between two versions. Scrolling one pane down must never move the
 * other one up, so the blocks that changed places are left out of the anchors.
 */
export const keepInOrder = <T>(items: T[], position: (item: T) => number): T[] => {
  // best[i] is the length of the longest run ending at i, previous[i] the item before it
  const best: number[] = [];
  const previous: number[] = [];
  let lastOfLongest = -1;

  for (const [index, item] of items.entries()) {
    best[index] = 1;
    previous[index] = -1;
    for (let earlier = 0; earlier < index; earlier++) {
      const candidate = items[earlier];
      if (
        candidate !== undefined &&
        position(candidate) < position(item) &&
        (best[earlier] ?? 0) + 1 > (best[index] ?? 0)
      ) {
        best[index] = (best[earlier] ?? 0) + 1;
        previous[index] = earlier;
      }
    }
    if (lastOfLongest === -1 || (best[index] ?? 0) > (best[lastOfLongest] ?? 0)) {
      lastOfLongest = index;
    }
  }

  const run: T[] = [];
  for (let index = lastOfLongest; index >= 0; index = previous[index] ?? -1) {
    const item = items[index];
    if (item !== undefined) run.unshift(item);
  }
  return run;
};

/**
 * Translates a scroll offset of the `from` pane into the offset that shows the same content in
 * the `to` pane, interpolating between the anchors on either side.
 *
 * A block that exists in one version only makes the two pages differ in height, so scrolling
 * both by the same number of pixels would drift apart after the first such block.
 *
 * @param anchors ascending in both `from` and `to`
 */
export const mapScrollPosition = (anchors: ScrollAnchor[], position: number): number => {
  const first = anchors[0];
  const last = anchors.at(-1);
  if (first === undefined || last === undefined) return position;
  if (position <= first.from) return first.to;
  if (position >= last.from) return last.to;

  for (let index = 1; index < anchors.length; index++) {
    const start = anchors[index - 1];
    const end = anchors[index];
    if (start === undefined || end === undefined || position > end.from) continue;

    const length = end.from - start.from;
    if (length <= 0) return end.to;
    return start.to + ((position - start.from) / length) * (end.to - start.to);
  }

  return last.to;
};
