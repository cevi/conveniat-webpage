/** More words make a query no better and every one is a regular expression on the index. */
const MAX_WORDS = 6;
const MAX_WORD_LENGTH = 64;
const SNIPPET_RADIUS = 70;

/** The words of a query, lower case and without repeats, as the index is searched for them. */
export const parseSearchWords = (query: string): string[] => {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.slice(0, MAX_WORD_LENGTH))
    .filter((word) => word !== '');
  return [...new Set(words)].slice(0, MAX_WORDS);
};

const firstMatchIndex = (lowerText: string, words: string[]): number => {
  let first = -1;
  for (const word of words) {
    const index = lowerText.indexOf(word);
    if (index !== -1 && (first === -1 || index < first)) first = index;
  }
  return first;
};

/** Whether the text holds every word, ignoring case. */
export const containsAllWords = (text: string, words: string[]): boolean => {
  const lowerText = text.toLowerCase();
  return words.every((word) => lowerText.includes(word));
};

/** How many of the words the text holds, ignoring case. */
export const countContainedWords = (text: string, words: string[]): number => {
  const lowerText = text.toLowerCase();
  return words.filter((word) => lowerText.includes(word)).length;
};

/**
 * A short passage of the text around the first of the words, cut at spaces and marked with an
 * ellipsis where it is cut. Without any of the words it is the start of the text.
 */
export const buildSnippet = (
  text: string,
  words: string[],
  radius: number = SNIPPET_RADIUS,
): string => {
  const matchIndex = firstMatchIndex(text.toLowerCase(), words);
  const center = Math.max(matchIndex, 0);
  let start = Math.max(0, center - radius);
  let end = Math.min(text.length, center + radius * 2);

  if (start > 0) {
    const space = text.indexOf(' ', start);
    if (space !== -1 && space < center) start = space + 1;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end);
    if (space > center) end = space;
  }

  const passage = text.slice(start, end).trim();
  return `${start > 0 ? '…' : ''}${passage}${end < text.length ? ' …' : ''}`;
};

export interface HighlightPart {
  text: string;
  isMatch: boolean;
}

/** Splits the text into the parts that are one of the words and the parts between them. */
export const splitHighlights = (text: string, words: string[]): HighlightPart[] => {
  const usable = words.filter((word) => word !== '');
  if (usable.length === 0 || text === '') return [{ text, isMatch: false }];

  const escaped = usable
    .toSorted((a, b) => b.length - a.length)
    .map((word) => word.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`));
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');
  return text
    .split(pattern)
    .filter((part) => part !== '')
    .map((part) => ({ text: part, isMatch: usable.includes(part.toLowerCase()) }));
};
