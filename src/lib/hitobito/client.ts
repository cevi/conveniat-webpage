import { SessionExpiredError } from '@/lib/hitobito/errors';
import {
  extractAuthenticityToken,
  extractCsrfMetaToken,
  extractFormFields,
} from '@/lib/hitobito/html-parser';
import type { Logger, RequestOptions } from '@/lib/hitobito/types';
import { CEVI_DATABASE_USER_AGENT } from '@/lib/hitobito/user-agent';
import { createLogger } from '@/utils/server-logger';
import { withSpan } from '@/utils/tracing-helpers';

/**
 * One line per request to Cevi.DB, at debug: a Hof sync alone sends several hundred. Written
 * here rather than through the caller's logger, which may be pino or a billing logger with
 * another signature, so every line has the same shape and filters as `hitobito:client`. It
 * runs inside the request's span and carries its `trace_id`, which leads to the whole run.
 */
const requestLogger = createLogger('hitobito:client');

export class FatalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalError';
  }
}

/** A frontend page redirects to its canonical URL at most a couple of times. */
const MAX_REDIRECTS = 5;

/** Where Hitobito sends a frontend request that carries no valid session. */
const SIGN_IN_PATH = '/users/sign_in';

/**
 * Whether a response is Hitobito's login page instead of what was asked for.
 *
 * An expired cookie is a `302` to the sign-in page, which `fetch` follows by default, so
 * the response is a `200` and `response.ok` says nothing. Every scraper downstream then
 * parses a login form and reports whatever it did not find there.
 */
function isSignInRedirect(requestedUrl: string, finalUrl: string): boolean {
  if (finalUrl === '') return false;
  return (
    new URL(finalUrl).pathname === SIGN_IN_PATH && new URL(requestedUrl).pathname !== SIGN_IN_PATH
  );
}

export class HitobitoClient {
  constructor(
    public readonly config: {
      baseUrl: string;
      apiToken: string;
      browserCookie: string;
    },
    private readonly logger?: Logger,
  ) {}

  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs = 20_000,
  ): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const config: RequestInit = {
        ...options,
        signal: options.signal ?? controller.signal,
      };
      const response = await fetch(url, config);
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }

  /**
   * Resolves a path, or an absolute URL such as a pagination link Cevi.DB returned, against
   * the configured base URL. Every request carries the API token or the session cookie, so
   * anything that resolves to another origin is refused instead of sent.
   */
  private resolveUrl(pathOrUrl: string, params?: Record<string, string>): string {
    const base = new URL(
      this.config.baseUrl.endsWith('/') ? this.config.baseUrl : `${this.config.baseUrl}/`,
    );
    const url = new URL(pathOrUrl, base);
    if (url.origin !== base.origin) {
      const message = `Refusing to send Cevi.DB credentials to ${url.origin}; only ${base.origin} is trusted`;
      // never expected: a link or a redirect from Cevi.DB pointing elsewhere is worth a look
      this.logger?.error(message);
      throw new FatalError(message);
    }
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.append(key, value);
      }
    }
    return url.toString();
  }

  /**
   * Fetches a frontend page and follows its redirects by hand, within the configured origin
   * only. `fetch` would follow them too, but on a redirect to another origin it keeps custom
   * headers like `X-Token`; here such a redirect is refused before anything is sent there.
   */
  private async fetchFollowingSameOriginRedirects(
    url: string,
    init: RequestInit,
  ): Promise<{ response: Response; finalUrl: string }> {
    let currentUrl = url;
    let currentInit = init;
    for (let hop = 0; ; hop += 1) {
      const response = await this.fetchWithTimeout(currentUrl, {
        ...currentInit,
        redirect: 'manual',
      });
      const location = response.headers.get('location');
      if (response.status < 300 || response.status >= 400 || location === null) {
        return { response, finalUrl: response.url === '' ? currentUrl : response.url };
      }
      if (hop >= MAX_REDIRECTS) {
        throw new Error(`Too many redirects from ${url}`);
      }
      // the body of a redirect is not needed, but must be read so the connection is released
      await response.text();
      const nextUrl = this.resolveUrl(new URL(location, currentUrl).toString());
      // as `fetch` does: after a 303, or a 301/302 to a POST, the next request is a GET
      const becomesGet =
        response.status === 303 ||
        ((response.status === 301 || response.status === 302) && currentInit.method === 'POST');
      if (becomesGet) {
        const headers = new Headers(currentInit.headers);
        headers.delete('Content-Type');
        // eslint-disable-next-line unicorn/no-null -- RequestInit spells "no body" as null
        currentInit = { ...currentInit, method: 'GET', headers, body: null };
      }
      currentUrl = nextUrl;
    }
  }

  // Official JSON API Methods
  async apiRequest<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    options: {
      params?: Record<string, string>;
      body?: unknown;
      signal?: AbortSignal;
    } = {},
  ): Promise<T> {
    return withSpan(`HitobitoClient.apiRequest:${method} ${path}`, async (span) => {
      const url = this.resolveUrl(path, options.params);

      span.setAttributes({
        'http.method': method,
        'http.route': path,
        'http.url': url,
      });

      const startedAt = performance.now();
      const response = await this.fetchWithTimeout(url, {
        method,
        headers: {
          'X-TOKEN': this.config.apiToken,
          'User-Agent': CEVI_DATABASE_USER_AGENT,
          'Content-Type': 'application/vnd.api+json',
          Accept: 'application/vnd.api+json',
        },
        body:
          options.body !== undefined && options.body !== null
            ? (JSON.stringify(options.body) as BodyInit)
            : undefined,
        signal: options.signal,
        // the JSON API does not redirect; a redirect is an error here, never followed with the
        // token to wherever it points
        redirect: 'manual',
      } as RequestInit);

      span.setAttribute('http.status_code', response.status);
      requestLogger.debug('Cevi.DB API request', {
        'http.request.method': method,
        // the path only: a person search puts names and email addresses in the query
        'url.path': new URL(url).pathname,
        'http.response.status_code': response.status,
        'hitobito.duration_ms': Math.round(performance.now() - startedAt),
      });

      if (!response.ok) {
        // Treat 404 on DELETE as success (idempotency)
        if (method === 'DELETE' && response.status === 404) {
          this.logger?.warn(`DELETE ${url} returned 404 (Not Found). Treating as success.`);
          return {} as T;
        }

        const text = await response.text();
        const error = new Error(
          `API ${method} failed: ${response.status} ${response.statusText} - ${text} at ${url}`,
        );
        span.recordException(error);
        throw error;
      }

      if (method === 'DELETE' || response.status === 204) {
        return {} as T;
      }

      const text = await response.text();
      if (text.length === 0) return {} as T;

      try {
        return JSON.parse(text) as T;
      } catch (error) {
        span.recordException(error as Error);
        return {} as T;
      }
    });
  }

  // Frontend / Browser based Methods (Scraping & Internal JSON)
  async frontendRequest(
    method: 'GET' | 'POST',
    urlOrPath: string,
    options: RequestOptions = {},
  ): Promise<{ response: Response; body: string; finalUrl: string }> {
    return withSpan(`HitobitoClient.frontendRequest:${method} ${urlOrPath}`, async (span) => {
      const url = this.resolveUrl(urlOrPath, options.params);

      span.setAttributes({
        'http.method': method,
        'http.url': url,
      });

      const headers = new Headers(options.headers);

      if (this.config.browserCookie.length > 0) {
        headers.set('Cookie', this.config.browserCookie);
      }

      if (method === 'POST' && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/x-www-form-urlencoded');
      }

      if (!headers.has('User-Agent')) {
        headers.set('User-Agent', CEVI_DATABASE_USER_AGENT);
      }

      const startedAt = performance.now();
      const { response, finalUrl } = await this.fetchFollowingSameOriginRedirects(url, {
        ...options,
        method,
        headers,
      });

      span.setAttribute('http.status_code', response.status);
      requestLogger.debug('Cevi.DB frontend request', {
        'http.request.method': method,
        // the path only: a person search puts names and email addresses in the query
        'url.path': new URL(url).pathname,
        'http.response.status_code': response.status,
        'hitobito.duration_ms': Math.round(performance.now() - startedAt),
      });

      // Drained before the check below, so a dead session does not leak the connection.
      const body = await response.text();

      if (isSignInRedirect(url, finalUrl)) {
        span.setAttribute('hitobito.session_expired', true);
        throw new SessionExpiredError(url);
      }

      return { response, body, finalUrl };
    });
  }

  getFrontendHeaders(referer?: string): HeadersInit {
    return {
      'User-Agent': CEVI_DATABASE_USER_AGENT,
      Referer: referer ?? this.config.baseUrl,
    };
  }

  /**
   * Abstracted logic for Rails form submission (GET form -> Extact token -> POST data)
   */
  async submitRailsForm({
    getFormUrl,
    postUrl,
    formData,
    params,
    method = 'POST',
    extractExtraFields = false,
    extraHeaders = {},
  }: {
    getFormUrl: string;
    postUrl: string;
    formData: Record<string, string | string[]>;
    params?: Record<string, string>;
    method?: 'POST' | 'PATCH' | 'PUT';
    extractExtraFields?: boolean;
    extraHeaders?: Record<string, string>;
  }): Promise<{ response: Response; body: string; finalUrl: string }> {
    return withSpan(`HitobitoClient.submitRailsForm:${method} ${postUrl}`, async (span) => {
      span.setAttributes({
        getFormUrl: getFormUrl,
        postUrl: postUrl,
      });

      // 1. Get Form
      const { response: formResponse, body: html } = await this.frontendRequest('GET', getFormUrl, {
        ...(params ? { params } : {}),
      });
      if (!formResponse.ok) {
        const error = new Error(`Failed to fetch form from ${getFormUrl}: ${formResponse.status}`);
        span.recordException(error);
        throw error;
      }

      // 2. Extract Tokens
      const token = extractAuthenticityToken(html);
      const metaToken = extractCsrfMetaToken(html);

      // 3. Prepare Payload
      const payload = new URLSearchParams();

      // Handle Rails method override
      if (method !== 'POST') {
        payload.append('_method', method.toLowerCase());
      }

      payload.append('authenticity_token', token);

      // Extract pre-existing fields if requested
      if (extractExtraFields) {
        const existingFields = extractFormFields(html);
        for (const [key, value] of Object.entries(existingFields)) {
          payload.append(key, value);
        }
      }

      // Append provided form data (this can overwrite extracted fields)
      for (const [key, value] of Object.entries(formData)) {
        if (Array.isArray(value)) {
          for (const val of value) {
            payload.append(key, val);
          }
        } else {
          if (payload.has(key)) {
            payload.delete(key);
          }
          payload.append(key, value);
        }
      }

      // 4. Submit
      const referer = new URL(getFormUrl, this.config.baseUrl).toString();
      const finalHeaders = {
        ...(this.getFrontendHeaders(referer) as Record<string, string>),
        ...extraHeaders,
      };

      if (metaToken !== '' && finalHeaders['x-csrf-token'] === undefined) {
        finalHeaders['x-csrf-token'] = metaToken;
      }

      const payloadString = payload.toString();
      // the size only: the form carries a person's data and the authenticity token
      requestLogger.debug('Submitting a Cevi.DB form', {
        'http.request.method': method,
        'url.path': postUrl,
        'http.request.body.size': payloadString.length,
      });

      const result = await this.frontendRequest('POST', postUrl, {
        headers: finalHeaders,
        body: payloadString,
      });

      return result;
    });
  }
}
