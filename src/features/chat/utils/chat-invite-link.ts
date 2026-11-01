/** The path of a chat invite, with or without a locale prefix; the token is base64url. */
const INVITE_PATH = /^\/(?:[a-z]{2}\/)?app\/chat\/new-chat-with-user\/([\w-]+)\/?$/;

/**
 * The page a scanned chat code opens, or `undefined` for anything that is not one. Only a
 * link to one of `origins` counts, so a code pointing elsewhere does not send the phone off
 * the app; the short host con27.ch is one of them where it is enabled.
 *
 * @param value - what the camera read
 * @param origins - the hosts an invite may come from, e.g. `https://conveniat27.ch`
 */
export const readChatInvitePath = (
  value: string,
  origins: readonly string[],
): string | undefined => {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return undefined;
  }
  const allowed = new Set(
    origins.flatMap((origin) => {
      try {
        return [new URL(origin).origin];
      } catch {
        return [];
      }
    }),
  );
  if (!allowed.has(url.origin)) return undefined;
  const token = INVITE_PATH.exec(url.pathname)?.[1];
  return token === undefined ? undefined : `/app/chat/new-chat-with-user/${token}`;
};

/**
 * What a scanned code holds, for telling the user what the camera read: a web link without
 * its scheme, e.g. `cevi.ch/agenda`, anything else as it is.
 *
 * @param value - what the camera read
 */
export const describeScannedCode = (value: string): string => {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      return `${url.host}${url.pathname === '/' ? '' : url.pathname}`;
    }
  } catch {
    // not a link
  }
  return trimmed;
};
