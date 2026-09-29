/**
 * Push services refuse a payload above 4096 bytes: FCM and APNs by their own limit, Web Push
 * because RFC 8291 only obliges a push service to accept that much, leaving 3993 bytes of
 * plaintext. An oversized push is not truncated by anyone - it is rejected outright, for every
 * recipient, and resending it fails the same way.
 *
 * The FCM message repeats the title and the body three times on iOS (the alert, the FCM data
 * keys APNs receives at the payload root, and `apns.payload.data`), so the text gets well
 * under a third of the budget; the rest is ids, the deep link and FCM's own keys. A push is a
 * preview anyway: tapping it opens the chat, where the whole message is.
 */
export const PUSH_BODY_MAX_BYTES = 800;
export const PUSH_TITLE_MAX_BYTES = 120;

const ELLIPSIS = '…';

const encoder = new TextEncoder();

/**
 * Bytes `text` takes up inside a JSON payload, which is how every push service measures it:
 * a newline or a quote costs two bytes there, an umlaut two and an emoji four.
 */
const payloadBytes = (text: string): number => encoder.encode(JSON.stringify(text)).length - 2;

/**
 * Shortens `text` to at most `maxBytes` payload bytes, ending in an ellipsis when anything was
 * cut. Cuts between graphemes, so an emoji or an accented letter is never split in half.
 */
export const fitPushText = (text: string, maxBytes: number): string => {
  if (payloadBytes(text) <= maxBytes) return text;

  const budget = maxBytes - payloadBytes(ELLIPSIS);
  let fitted = '';
  let used = 0;
  for (const { segment } of new Intl.Segmenter().segment(text)) {
    const size = payloadBytes(segment);
    if (used + size > budget) break;
    fitted += segment;
    used += size;
  }

  return fitted.trimEnd() + ELLIPSIS;
};
