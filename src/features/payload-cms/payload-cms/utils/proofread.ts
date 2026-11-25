/**
 * What the proofreading in the publish dialog exchanges between the `/proofread` endpoint and
 * the admin panel, and the text helpers both sides share. Nothing here may import server code:
 * the dialog applies a suggestion with the same functions the endpoint used to decide that it
 * can be applied.
 */

export const PROOFREAD_CATEGORIES = ['spelling', 'grammar', 'glossary', 'style'] as const;

export type ProofreadCategory = (typeof PROOFREAD_CATEGORIES)[number];

export type ProofreadFieldType = 'text' | 'textarea' | 'richText';

/** One problem Gemini found in the text of a field. */
export interface ProofreadFinding {
  id: string;
  /** The form path of the field, like `content.2.richText`. */
  path: string;
  fieldType: ProofreadFieldType;
  fieldLabel: string;
  category: ProofreadCategory;
  original: string;
  suggestion: string;
  explanation: string;
  /** A few characters around `original`, so the editor recognises the place. */
  before: string;
  after: string;
  /** Whether `original` occurs exactly once in the field, so a click can replace it. */
  applicable: boolean;
}

export type ProofreadResponse =
  /** The deployment has no Gemini key. */
  | { status: 'disabled' }
  /** `truncated`: the text was longer than one check takes, and its end stays unchecked. */
  | { status: 'done'; findings: ProofreadFinding[]; truncated: boolean };

interface LexicalNode {
  type?: unknown;
  text?: unknown;
  children?: unknown;
  [key: string]: unknown;
}

const isNode = (value: unknown): value is LexicalNode =>
  typeof value === 'object' && value !== null;

const childrenOf = (node: LexicalNode): LexicalNode[] =>
  Array.isArray(node.children) ? node.children.filter((child) => isNode(child)) : [];

const rootOf = (state: unknown): LexicalNode | undefined =>
  isNode(state) && isNode(state['root']) ? state['root'] : undefined;

/** How often `needle` occurs in `haystack`, without overlaps. */
export const countOccurrences = (haystack: string, needle: string): number => {
  if (needle === '') return 0;
  return haystack.split(needle).length - 1;
};

const INLINE_TYPES = new Set(['text', 'linebreak', 'tab', 'link', 'autolink']);

const textNodes = (node: LexicalNode): LexicalNode[] =>
  node.type === 'text' && typeof node.text === 'string'
    ? [node]
    : childrenOf(node).flatMap((child) => textNodes(child));

const plainText = (node: LexicalNode): string => {
  if (node.type === 'text' && typeof node.text === 'string') return node.text;
  if (node.type === 'linebreak') return '\n';
  if (node.type === 'tab') return '\t';
  return childrenOf(node)
    .map((child) => plainText(child))
    .join('');
};

/**
 * The text of a Lexical editor state, one line per paragraph, heading or list item. Nodes
 * without text, like images and embedded blocks, are left out.
 */
export const lexicalPlainText = (state: unknown): string => {
  const root = rootOf(state);
  if (root === undefined) return '';
  const lines: string[] = [];
  const collect = (node: LexicalNode): void => {
    // a paragraph holds only text and links; a list or a quote holds further blocks
    const children = childrenOf(node);
    if (children.some((child) => !INLINE_TYPES.has(String(child.type)))) {
      for (const child of children) collect(child);
      return;
    }
    const line = plainText(node);
    if (line.trim() !== '') lines.push(line);
  };
  collect(root);
  return lines.join('\n');
};

/** Replaces `original` in `text` when it occurs exactly once, otherwise returns undefined. */
export const replaceUniqueInText = (
  text: string,
  original: string,
  suggestion: string,
): string | undefined =>
  countOccurrences(text, original) === 1 ? text.replace(original, () => suggestion) : undefined;

/**
 * Replaces `original` in a Lexical editor state when it occurs exactly once, inside a single
 * text node, so its formatting stays as it was. Returns a new state, or undefined when the
 * place is not unique or spans differently formatted text.
 */
export const replaceUniqueInLexical = (
  state: unknown,
  original: string,
  suggestion: string,
): unknown => {
  const root = rootOf(state);
  if (root === undefined || countOccurrences(lexicalPlainText(state), original) !== 1) {
    return undefined;
  }
  const copy = structuredClone(state) as { root: LexicalNode };
  const target = textNodes(copy.root).find(
    (node) => countOccurrences(node.text as string, original) === 1,
  );
  if (target === undefined) return undefined;
  target.text = (target.text as string).replace(original, () => suggestion);
  return copy;
};
