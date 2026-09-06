import build from '@/build';
import { initHttpClient } from '@/lib/http-client';
import { hostMetrics, sdk } from '@/tracing';
import { installConsoleOtelBridge } from '@/utils/otel-console-bridge';

export function register(): void {
  // eslint-disable-next-line n/no-process-env
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    // initialize the global HTTP client
    initHttpClient();
  }

  // start the SDK
  console.log(
    `Starting OpenTelemetry SDK for ${build.version} (${build.git.hash}) on branch ${build.git.branch}`,
  );

  sdk.start();
  hostMetrics.start();

  // Must come after sdk.start(): before the SDK registers a LoggerProvider the
  // logs API hands back a no-op logger, so anything captured earlier is dropped.
  installConsoleOtelBridge();
}

/**
 * Names an error whose `message` is empty.
 *
 * Next.js throws bail-out and control-flow sentinels as a bare `new Error()` and keeps the
 * identity somewhere other than `message`: `StaticGenBailoutError` carries
 * `code: 'NEXT_STATIC_GEN_BAILOUT'` and prints the reason through `console.error` right before
 * throwing, `redirect()` and `notFound()` carry only a `digest`. Captured as they are, all of
 * them reach PostHog with an empty `$exception_message` and collapse into one issue titled
 * "Error" that names neither the route nor the reason.
 * see: https://github.com/cevi/conveniat-webpage/issues/1582
 *
 * The constructor name comes last because a production bundle minifies it —
 * `StaticGenBailoutError` ships as `tE` — so it only identifies the error in development.
 */
const describeMessagelessError = (error: object): string => {
  if ('digest' in error && typeof error.digest === 'string' && error.digest !== '') {
    return error.digest;
  }
  if ('code' in error && typeof error.code === 'string' && error.code !== '') {
    return error.code;
  }
  const constructorName: unknown = (error as { constructor?: { name?: unknown } }).constructor
    ?.name;
  return typeof constructorName === 'string' && constructorName !== '' ? constructorName : 'Error';
};

/**
 * The error handed to PostHog. One that already has a message is reported unchanged. One without
 * a message is reported through a stand-in carrying the description and the original stack, so
 * the issue is readable and still points at the frames that threw.
 */
const toReportableError = (error: unknown): unknown => {
  if (error === null || typeof error !== 'object') return error;
  if ('message' in error && typeof error.message === 'string' && error.message !== '') return error;

  const reportable = new Error(describeMessagelessError(error));
  if ('name' in error && typeof error.name === 'string' && error.name !== '') {
    reportable.name = error.name;
  }
  if ('stack' in error && typeof error.stack === 'string') {
    reportable.stack = error.stack;
  }
  return reportable;
};

export const onRequestError = async (
  error: unknown,
  request: { headers: Record<string, string | string[] | undefined> },
  context: unknown,
): Promise<void> => {
  // eslint-disable-next-line n/no-process-env
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    const { getPostHogServer } = await import('./lib/posthog-server');
    const posthog = getPostHogServer();
    let distinctId: string | undefined;

    const cookieHeader = request.headers['cookie'];
    if (cookieHeader !== undefined) {
      // Normalize multiple cookie arrays to string
      const cookieString = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;

      const postHogCookieMatch = cookieString.match(/ph_phc_.*?_posthog=([^;]+)/);

      if (postHogCookieMatch?.[1] !== undefined) {
        try {
          const decodedCookie = decodeURIComponent(postHogCookieMatch[1]);
          if (posthog !== undefined) {
            const postHogData = JSON.parse(decodedCookie) as Record<string, unknown>;
            if (typeof postHogData['distinct_id'] === 'string') {
              distinctId = postHogData['distinct_id'];
            }
          }
        } catch (error_) {
          console.error('Error parsing PostHog cookie:', error_);
        }
      }
    }

    if (posthog !== undefined) {
      // Extract properties for better tracing
      const properties: Record<string, unknown> = {};

      if (context !== null && typeof context === 'object' && !Array.isArray(context)) {
        Object.assign(properties, context);
      }

      if (request.headers['referer'] !== undefined)
        properties['referer'] = request.headers['referer'];
      if (request.headers['user-agent'] !== undefined)
        properties['user-agent'] = request.headers['user-agent'];
      if (request.headers['x-forwarded-for'] !== undefined)
        properties['x-forwarded-for'] = request.headers['x-forwarded-for'];

      let errorMessage = '';
      let digest: string | undefined;
      if (error !== null && typeof error === 'object') {
        if ('digest' in error) {
          properties['digest'] = error.digest;
          if (typeof error.digest === 'string') {
            digest = error.digest;
          }
        }
        if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
          properties['errorMessage'] = error.message;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      const is404 =
        digest === 'NEXT_NOT_FOUND' ||
        digest?.includes('404') === true ||
        errorMessage.includes('NEXT_NOT_FOUND') ||
        errorMessage.includes('404') ||
        errorMessage.includes('PAGE_NOT_FOUND_ERROR') ||
        errorMessage.includes('PAGE_NOT_FOUND');

      if (is404) {
        return;
      }

      const { noiseMessages } = await import('@/utils/posthog-filters');
      if (noiseMessages.some((message) => errorMessage.includes(message))) {
        return;
      }

      posthog.captureException(toReportableError(error), distinctId, properties);

      try {
        await posthog.flush();
      } catch (flushError) {
        console.error('Error flushing PostHog events:', flushError);
      }
    }
  }
};
