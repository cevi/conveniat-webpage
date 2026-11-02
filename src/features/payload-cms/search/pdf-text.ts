/** A page holds more text than any search snippet needs; the rest only bloats the index. */
const MAX_PAGE_TEXT_LENGTH = 20_000;
/** Past this a PDF is a scanned book, not a camp document; its first pages are enough. */
const MAX_PAGES = 300;

/**
 * Splits the output of `pdftotext` into the text of each page. pdftotext ends every page with a
 * form feed, so the text after the last one is empty and is not a page. Whitespace is collapsed,
 * because the layout of a PDF breaks lines in the middle of sentences.
 */
export const splitPdfText = (output: string): string[] => {
  const pages = output.split('\f');
  if (pages.length > 1 && pages.at(-1)?.trim() === '') pages.pop();
  return pages
    .slice(0, MAX_PAGES)
    .map((page) => page.replaceAll(/\s+/g, ' ').trim().slice(0, MAX_PAGE_TEXT_LENGTH));
};
