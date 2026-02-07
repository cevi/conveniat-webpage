import {
  extractAuthenticityToken,
  extractCsrfMetaToken,
  extractFormFields,
} from '@/features/registration_process/hitobito-api/html-parser';
import type { Logger, RequestOptions } from '@/features/registration_process/hitobito-api/types';

export class FatalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalError';
  }
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

  private buildUrl(base: string, path: string, params?: Record<string, string>): string {
    const url = new URL(path, base.endsWith('/') ? base : `${base}/`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.append(key, value);
      }
    }
    return url.toString();
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
    const url = this.buildUrl(this.config.baseUrl, path, options.params);
    this.logger?.info(`${method} ${url}`);

    const response = await this.fetchWithTimeout(url, {
      method,
      headers: {
        'X-TOKEN': this.config.apiToken,
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
      },
      body:
        options.body !== undefined && options.body !== null
          ? (JSON.stringify(options.body) as BodyInit)
          : undefined,
      signal: options.signal,
    } as RequestInit);

    if (!response.ok) {
      // Treat 404 on DELETE as success (idempotency)
      if (method === 'DELETE' && response.status === 404) {
        this.logger?.warn(`DELETE ${url} returned 404 (Not Found). Treating as success.`);
        return {} as T;
      }

      const text = await response.text();
      throw new Error(
        `API ${method} failed: ${response.status} ${response.statusText} - ${text} at ${url}`,
      );
    }

    if (method === 'DELETE' || response.status === 204) {
      return {} as T;
    }

    const text = await response.text();
    if (text.length === 0) return {} as T;

    try {
      return JSON.parse(text) as T;
    } catch {
      return {} as T;
    }
  }

  // Frontend / Browser based Methods (Scraping & Internal JSON)
  async frontendRequest(
    method: 'GET' | 'POST',
    urlOrPath: string,
    options: RequestOptions = {},
  ): Promise<{ response: Response; body: string }> {
    const url = urlOrPath.startsWith('http')
      ? urlOrPath
      : this.buildUrl(this.config.baseUrl, urlOrPath, options.params);

    const headers = new Headers(options.headers);
    if (this.config.browserCookie.length > 0) {
      headers.set('Cookie', this.config.browserCookie);
    }

    if (method === 'POST' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/x-www-form-urlencoded');
    }

    if (!headers.has('User-Agent')) {
      headers.set('User-Agent', 'Mozilla/5.0 (compatible; conveniat27-bot/1.0)');
    }

    this.logger?.info(`Frontend ${method} ${url}`);

    const response = await this.fetchWithTimeout(url, {
      ...options,
      method,
      headers,
    });

    const body = await response.text();
    return { response, body };
  }

  getFrontendHeaders(referer?: string): HeadersInit {
    return {
      'User-Agent': 'Mozilla/5.0 (compatible; conveniat27-bot/1.0)',
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
    // 1. Get Form
    const { response: formResponse, body: html } = await this.frontendRequest('GET', getFormUrl, {
      ...(params ? { params } : {}),
    });
    if (!formResponse.ok) {
      throw new Error(`Failed to fetch form from ${getFormUrl}: ${formResponse.status}`);
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
        // Only overwrite if not empty or if explicitly provided?
        // Actually, URLSearchParams.set would overwrite. append adds multiple.
        // We probably want to OVERWRITE extracted fields with provided data.
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

    const result = await this.frontendRequest('POST', postUrl, {
      headers: finalHeaders,
      body: payload.toString(),
    });

    return { ...result, finalUrl: result.response.url };
  }
}
