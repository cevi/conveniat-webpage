import build from '@/build';
import { initHttpClient } from '@/lib/http-client';
import { hostMetrics, sdk } from '@/tracing';

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
}

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

      if (error !== null && typeof error === 'object') {
        if ('digest' in error) properties['digest'] = error.digest;
        if ('message' in error && typeof error.message === 'string') {
          properties['errorMessage'] = error.message;
        }
      }

      posthog.captureException(error, distinctId, properties);

      try {
        await posthog.flush();
      } catch (flushError) {
        console.error('Error flushing PostHog events:', flushError);
      }
    }
  }
};
