import { HITOBITO_CONFIG } from '@/features/registration_process/hitobito-api/config';

interface RequestOptions extends RequestInit {
  cookies?: string;
  params?: Record<string, string>;
}

export class FatalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalError';
  }
}

export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

async function fetchWithTimeout(
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

function buildUrl(base: string, path: string, params?: Record<string, string>): string {
  const url = new URL(path, base);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }
  }
  return url.toString();
}

// JSON API Client
export async function apiGet<T>(
  path: string,
  params?: Record<string, string>,
  signal?: AbortSignal,
  logger?: Logger,
): Promise<T> {
  const url = buildUrl(HITOBITO_CONFIG.baseUrl, path, params);

  if (logger) logger.info(`GET ${url}`);

  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      'X-TOKEN': HITOBITO_CONFIG.apiToken,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    },
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    throw new Error(`API GET failed: ${response.status} ${response.statusText} ${url}`);
  }

  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown, logger?: Logger): Promise<T> {
  const url = buildUrl(HITOBITO_CONFIG.baseUrl, path);

  if (logger) logger.info(`POST ${url}`);

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'X-TOKEN': HITOBITO_CONFIG.apiToken,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    // Try to read error body
    const text = await response.text();
    throw new Error(`API POST failed: ${response.status} ${response.statusText} - ${text}`);
  }

  // Some endpoints might return empty body
  const text = await response.text();
  if (text.length === 0) return {} as T; // Changed from !text to text.length === 0

  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

export async function apiPatch<T>(path: string, body: unknown, logger?: Logger): Promise<T> {
  const url = buildUrl(HITOBITO_CONFIG.baseUrl, path);

  if (logger) logger.info(`PATCH ${url}`);

  const response = await fetchWithTimeout(url, {
    method: 'PATCH',
    headers: {
      'X-TOKEN': HITOBITO_CONFIG.apiToken,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API PATCH failed: ${response.status} ${response.statusText} - ${text}`);
  }

  const text = await response.text();
  if (text.length === 0) return {} as T; // Changed from !text to text.length === 0

  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

export async function apiDelete(path: string, logger?: Logger): Promise<boolean> {
  const url = buildUrl(HITOBITO_CONFIG.baseUrl, path);

  if (logger) logger.info(`DELETE ${url}`);

  const response = await fetchWithTimeout(url, {
    method: 'DELETE',
    headers: {
      'X-TOKEN': HITOBITO_CONFIG.apiToken,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API DELETE failed: ${response.status} ${response.statusText} - ${text}`);
  }

  return true;
}

// Frontend Client (Cookie based)
export async function httpGet(
  url: string,
  options: RequestOptions = {},
): Promise<{ response: Response; body: string }> {
  const headers = new Headers(options.headers);
  if (options.cookies !== undefined) {
    headers.set('Cookie', options.cookies);
  }

  const response = await fetchWithTimeout(
    url,
    {
      ...options,
      headers,
    },
    20_000,
  );

  const body = await response.text();
  return { response, body };
}

export async function httpPost(
  url: string,
  options: RequestOptions = {},
): Promise<{ response: Response; body: string }> {
  const headers = new Headers(options.headers);
  if (options.cookies !== undefined) {
    headers.set('Cookie', options.cookies);
  }
  // Default content type if not set
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/x-www-form-urlencoded');
  }

  const response = await fetchWithTimeout(
    url,
    {
      ...options,
      method: 'POST',
      headers,
    },
    20_000,
  );

  const body = await response.text();
  return { response, body };
}

export function getBrowserCookie(): string {
  return HITOBITO_CONFIG.browserCookie;
}

export function getFrontendHeaders(referer?: string): HeadersInit {
  return {
    'User-Agent': 'Mozilla/5.0 (compatible; ConveniatBot/1.0)',
    Referer: referer ?? HITOBITO_CONFIG.frontendUrl,
  };
}
