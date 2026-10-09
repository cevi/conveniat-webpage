import { diffTokens } from '@/features/payload-cms/payload-cms/components/version-compare/diff-tokens';
import type { ScrollAnchor } from '@/features/payload-cms/payload-cms/components/version-compare/scroll-map';
import { keepInOrder } from '@/features/payload-cms/payload-cms/components/version-compare/scroll-map';

/** How many blocks differ between the two rendered versions. */
export interface DiffSummary {
  removed: number;
  added: number;
  changed: number;
}

type BlockChange = 'removed' | 'added' | 'changed';

const BLOCK_ATTRIBUTE = 'data-version-diff';
const STYLE_ID = 'version-diff-style';
const REMOVED_HIGHLIGHT = 'version-diff-removed';
const ADDED_HIGHLIGHT = 'version-diff-added';

// The colours of Payload's own field diff, as plain values: the page inside the frame is the
// public site and knows none of the admin theme variables.
const STYLES = `
  [${BLOCK_ATTRIBUTE}] { outline: 2px solid var(--version-diff); outline-offset: -2px; }
  [${BLOCK_ATTRIBUTE}='removed'] { --version-diff: #e5484d; background-color: #fdecec; }
  [${BLOCK_ATTRIBUTE}='added'] { --version-diff: #3b8fd9; background-color: #e5f1fb; }
  [${BLOCK_ATTRIBUTE}='changed'] { --version-diff: #c9cdd3; outline-style: dashed; outline-width: 1px; }
  ::highlight(${REMOVED_HIGHLIGHT}) { background-color: #f9c6c6; color: #a1171b; text-decoration: line-through; }
  ::highlight(${ADDED_HIGHLIGHT}) { background-color: #bfdcf5; color: #0b4f8a; }
`;

interface Token {
  text: string;
  node: Text;
  start: number;
  end: number;
}

/** The blocks of the page, without the ones nested inside a column or a tab. */
const topLevelBlocks = (page: Document): Map<string, HTMLElement> => {
  const blocks = new Map<string, HTMLElement>();
  for (const element of page.querySelectorAll<HTMLElement>('[data-block-id]')) {
    const id = element.dataset['blockId'];
    if (id === undefined || element.parentElement?.closest('[data-block-id]')) continue;
    blocks.set(id, element);
  }
  return blocks;
};

const collectTokens = (block: HTMLElement): Token[] => {
  const tokens: Token[] = [];
  const walker = block.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const parentTag = node.parentElement?.tagName;
    if (parentTag === 'SCRIPT' || parentTag === 'STYLE' || parentTag === 'NOSCRIPT') continue;

    for (const match of (node.nodeValue ?? '').matchAll(/\S+/g)) {
      tokens.push({
        text: match[0],
        node: node as Text,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }
  return tokens;
};

/** One range per run of neighbouring words, so a changed sentence reads as one mark. */
const toRanges = (tokens: Token[], indices: number[]): Range[] => {
  const ranges: Range[] = [];
  let run: { node: Text; start: number; end: number; lastIndex: number } | undefined;

  const close = (): void => {
    if (run === undefined) return;
    const range = run.node.ownerDocument.createRange();
    range.setStart(run.node, run.start);
    range.setEnd(run.node, run.end);
    ranges.push(range);
    run = undefined;
  };

  for (const index of indices) {
    const token = tokens[index];
    if (token === undefined) continue;

    if (run?.node === token.node && run.lastIndex === index - 1) {
      run.end = token.end;
      run.lastIndex = index;
    } else {
      close();
      run = { node: token.node, start: token.start, end: token.end, lastIndex: index };
    }
  }
  close();
  return ranges;
};

/** What a block shows besides text: a swapped image or link target changes none of the words. */
const mediaSignature = (block: HTMLElement): string =>
  [...block.querySelectorAll('img, a[href], iframe, video, source')]
    .map((element) => element.getAttribute('src') ?? element.getAttribute('href') ?? '')
    .join('|');

const setHighlight = (page: Document, name: string, ranges: Range[]): void => {
  const frameWindow = page.defaultView;
  // Firefox before 140 and Safari before 17.2 have no highlight registry. The changed blocks
  // are still outlined there, only the words inside are not marked.
  if (frameWindow === null || !('highlights' in frameWindow.CSS)) return;

  if (ranges.length === 0) {
    frameWindow.CSS.highlights.delete(name);
  } else {
    // The ranges belong to the framed document, so its own constructor has to build the set.
    frameWindow.CSS.highlights.set(name, new frameWindow.Highlight(...ranges));
  }
};

/** Removes every mark from a page, leaving it as the server rendered it. */
export const clearDiff = (page: Document): void => {
  for (const element of page.querySelectorAll(`[${BLOCK_ATTRIBUTE}]`)) {
    element.removeAttribute(BLOCK_ATTRIBUTE);
  }
  page.querySelector(`#${STYLE_ID}`)?.remove();
  setHighlight(page, REMOVED_HIGHLIGHT, []);
  setHighlight(page, ADDED_HIGHLIGHT, []);
};

const prepare = (page: Document): void => {
  clearDiff(page);
  const style = page.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLES;
  page.head.append(style);
};

const mark = (block: HTMLElement, change: BlockChange): void => {
  block.setAttribute(BLOCK_ATTRIBUTE, change);
};

/**
 * Marks what differs between two rendered versions of a page, in place.
 *
 * Blocks are matched by the id Payload gives each block, so a block that was inserted or removed
 * does not shift the comparison of everything after it. Within a block that is in both
 * versions, the text is compared word by word. The words are marked with the CSS Custom
 * Highlight API, which paints ranges without touching the DOM the page's React tree owns.
 */
export const applyDiff = (before: Document, after: Document): DiffSummary => {
  prepare(before);
  prepare(after);

  const beforeBlocks = topLevelBlocks(before);
  const afterBlocks = topLevelBlocks(after);
  const summary: DiffSummary = { removed: 0, added: 0, changed: 0 };
  const removedRanges: Range[] = [];
  const addedRanges: Range[] = [];

  for (const [id, block] of beforeBlocks) {
    const counterpart = afterBlocks.get(id);
    if (counterpart === undefined) {
      mark(block, 'removed');
      summary.removed++;
      continue;
    }

    const beforeTokens = collectTokens(block);
    const afterTokens = collectTokens(counterpart);
    const { removed, added } = diffTokens(
      beforeTokens.map((token) => token.text),
      afterTokens.map((token) => token.text),
    );

    const textChanged = removed.length > 0 || added.length > 0;
    if (!textChanged && mediaSignature(block) === mediaSignature(counterpart)) continue;

    removedRanges.push(...toRanges(beforeTokens, removed));
    addedRanges.push(...toRanges(afterTokens, added));
    mark(block, 'changed');
    mark(counterpart, 'changed');
    summary.changed++;
  }

  for (const [id, block] of afterBlocks) {
    if (beforeBlocks.has(id)) continue;
    mark(block, 'added');
    summary.added++;
  }

  setHighlight(before, REMOVED_HIGHLIGHT, removedRanges);
  setHighlight(after, ADDED_HIGHLIGHT, addedRanges);

  return summary;
};

const offsetTop = (element: HTMLElement): number =>
  element.getBoundingClientRect().top + (element.ownerDocument.defaultView?.scrollY ?? 0);

/**
 * The scroll offsets at which both pages show the same block, from top to bottom.
 * Read when a pane scrolls, not once: images and client components keep changing the heights.
 */
export const readScrollAnchors = (before: Document, after: Document): ScrollAnchor[] => {
  const afterBlocks = topLevelBlocks(after);
  const shared: ScrollAnchor[] = [];

  for (const [id, block] of topLevelBlocks(before)) {
    const counterpart = afterBlocks.get(id);
    if (counterpart === undefined) continue;
    shared.push({ from: offsetTop(block), to: offsetTop(counterpart) });
  }
  shared.sort((first, second) => first.from - second.from);

  return [
    { from: 0, to: 0 },
    ...keepInOrder(shared, (anchor) => anchor.to),
    {
      from: before.documentElement.scrollHeight,
      to: after.documentElement.scrollHeight,
    },
  ];
};
