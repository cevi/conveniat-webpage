/**
 * The push services a browser hands out subscriptions for. A subscription comes from the
 * client and its endpoint is where this server posts every push, so a host that is not on
 * this list would let anyone holding a subscription aim those requests at a host of their
 * choosing, inside the cluster network included.
 *
 * Self-hosted push services, like a UnifiedPush distributor, cannot be listed and get no
 * web push.
 */
const PUSH_SERVICE_HOSTS = new Set([
  // Chrome and the browsers built on it: Brave, Opera, Samsung Internet, Vivaldi.
  'fcm.googleapis.com',
  // Chrome hands this host out next to FCM.
  'jmt17.google.com',
  // Firefox.
  'updates.push.services.mozilla.com',
]);

/** Services that spread their subscriptions over subdomains. The leading dot is the check. */
const PUSH_SERVICE_HOST_SUFFIXES = [
  // Safari, `web.push.apple.com`.
  '.push.apple.com',
  // Edge, one host per data centre like `wns2-par02p.notify.windows.com`.
  '.notify.windows.com',
];

/** What an admin reads when a send is refused for its endpoint. */
export const UNKNOWN_PUSH_SERVICE_ERROR = 'Web Push endpoint is not a known push service.';

/** The host of a push endpoint, for a log line. */
export const endpointHostOf = (endpoint: unknown): string | undefined => {
  if (typeof endpoint !== 'string') return undefined;
  try {
    return new URL(endpoint).host;
  } catch {
    return undefined;
  }
};

/**
 * Whether a push may be posted to this endpoint: HTTPS on the default port, to one of the
 * push services above.
 */
export const isPushServiceEndpoint = (endpoint: unknown): endpoint is string => {
  if (typeof endpoint !== 'string') return false;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  // web-push reads the host with the legacy `url.parse`, not with `URL`. An endpoint that
  // is already in its serialised form leaves the two nothing to disagree about.
  if (url.href !== endpoint) return false;
  if (url.protocol !== 'https:' || url.port !== '') return false;
  if (url.username !== '' || url.password !== '') return false;
  return (
    PUSH_SERVICE_HOSTS.has(url.hostname) ||
    PUSH_SERVICE_HOST_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix))
  );
};
