/**
 * Turns the lightweight markdown dialect the chat renders into plain text.
 *
 * Chat messages and announcements are written in - and stored as - the dialect
 * `format-message-content.tsx` renders: `*bold*`, `_italic_`, `~strikethrough~`
 * and `[label](url)`. A notification is the one surface that never runs that
 * renderer: the operating system shows the body verbatim, so the markers leak
 * through as literal asterisks and underscores (see issue #1626). Announcements
 * are the worst case, because their title is wrapped in `*…*` by the publish
 * hook and therefore *every* announcement push started with a stray asterisk.
 *
 * The dialect recognised here is deliberately the same one the renderer
 * recognises, matched with the same expressions: anything that stays literal in
 * the chat bubble - a lone `*`, a multiplication, `**bold**` - has to stay
 * literal in the notification too, or the two views disagree about what the
 * message says.
 */

/** Mirrors the token expressions in `format-message-content.tsx`. */
const boldRegex = /^\*(.+)\*$/;
const italicRegex = /^_(.+)_$/;
const strikethroughRegex = /^~(.+)~$/;
const markdownLinkRegex = /^\[(.+?)]\((https?:\/\/[^\s)]+)\)$/;

/**
 * Formatting tokens, in the renderer's order. Bare URLs are matched too, even
 * though they carry no formatting: without that alternative, the `_` and `*` in
 * a link such as `https://example.org/a_b_c` would be read as emphasis markers
 * and silently cut out of the URL. Matching the URL as one token keeps it whole,
 * exactly as the renderer does.
 */
const formattingTokenRegex =
  /\*.*?\*|_.*?_|~.*?~|\[[^\]]+]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s)]+/g;

/**
 * Nesting depth to unwrap. The renderer only ever unwraps one layer, but the
 * lexical serialiser emits `_*text*_` for text that is bold *and* italic, so a
 * single pass would leave the inner marker behind.
 */
const MAX_UNWRAP_PASSES = 4;

const unwrapOnce = (text: string): string =>
  text.replaceAll(formattingTokenRegex, (token) => {
    const link = markdownLinkRegex.exec(token);
    if (link?.[1] !== undefined) return link[1];

    const emphasis =
      boldRegex.exec(token) ?? italicRegex.exec(token) ?? strikethroughRegex.exec(token);
    return emphasis?.[1] ?? token;
  });

/**
 * Removes the chat's markdown markers from `text`, keeping the words themselves
 * (a link collapses to its label, which is what the reader sees in the chat).
 *
 * Idempotent: text that carries no formatting is returned unchanged.
 */
export const stripMarkdownFormatting = (text: string): string => {
  let stripped = text;

  for (let pass = 0; pass < MAX_UNWRAP_PASSES; pass++) {
    const next = unwrapOnce(stripped);
    if (next === stripped) break;
    stripped = next;
  }

  return stripped;
};
