import { describeMessagePreview } from '@/features/chat/api/utils/get-message-preview-text';
import type { MessagePreviewIcon } from '@/features/chat/types/api-dto-types';
import type { Locale } from '@/types/types';

const QUOTED_SNIPPET_MAX_LENGTH = 100;

/**
 * The text a reply stores of the message it quotes, so its bubble reads before the quoted
 * message is loaded. Only a message with text has one: an image or a location is described
 * from the quoted message itself, see {@link describeQuotedMessage}, and its payload is no text.
 *
 * @param payload - the newest content of the quoted message
 * @returns its text, cut to 100 characters, or undefined without text
 */
export const quotedSnippetOf = (payload: unknown): string | undefined => {
  let text: unknown = payload;
  if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
    text = (payload as Record<string, unknown>)['text'];
  }
  if (typeof text !== 'string' || text === '') return undefined;
  return text.length > QUOTED_SNIPPET_MAX_LENGTH
    ? `${text.slice(0, QUOTED_SNIPPET_MAX_LENGTH)}...`
    : text;
};

/**
 * A quoted message the way the chat list names it: its text without markdown, or for an image,
 * a location or an alert a word in the reader's locale and the icon that goes in front of it.
 *
 * @param payload - the newest content of the quoted message
 * @param locale - the reader's locale
 * @returns the line, empty when there is nothing to say, and the icon if it has one
 */
export const describeQuotedMessage = (
  payload: unknown,
  locale: Locale,
): { text: string; icon?: MessagePreviewIcon | undefined } => {
  const { messagePreview, messagePreviewIcon } = describeMessagePreview({
    contentVersions: [{ payload }],
  });
  const text = typeof messagePreview === 'string' ? messagePreview : messagePreview[locale];
  return { text, icon: messagePreviewIcon };
};
