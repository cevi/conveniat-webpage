/**
 * The stored browser cookie no longer authenticates a Cevi.DB session.
 *
 * Hitobito answers an unauthenticated frontend request with a redirect to its sign-in
 * page, and `fetch` follows redirects, so the caller would otherwise receive a perfectly
 * fine `200` carrying a login form and parse it as the page it asked for.
 */
export class SessionExpiredError extends Error {
  public readonly requestedUrl: string;

  constructor(requestedUrl: string) {
    super(
      `Cevi.DB session is not authenticated: ${requestedUrl} was redirected to the sign-in page. The stored browser cookie has expired.`,
    );
    this.name = 'SessionExpiredError';
    this.requestedUrl = requestedUrl;
  }
}
