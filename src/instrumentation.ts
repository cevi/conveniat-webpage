import build from '@/build';
import { hostMetrics, sdk } from '@/tracing';

export function register(): void {
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: unknown,
): Promise<void> => {
  // eslint-disable-next-line n/no-process-env
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, unicorn/prefer-module, @typescript-eslint/no-unsafe-assignment
    const { getPostHogServer } = require('./lib/posthog-server');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const posthog = getPostHogServer();
    let distinctId: string | undefined;

    const cookieHeader = request.headers['cookie'];
    if (cookieHeader) {
      // Normalize multiple cookie arrays to string
      const cookieString = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;

      const postHogCookieMatch = cookieString.match(/ph_phc_.*?_posthog=([^;]+)/);

      if (postHogCookieMatch?.[1]) {
        try {
          const decodedCookie = decodeURIComponent(postHogCookieMatch[1]);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const postHogData = JSON.parse(decodedCookie);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          distinctId = postHogData.distinct_id;
        } catch (error_) {
          console.error('Error parsing PostHog cookie:', error_);
        }
      }
    }

    if (posthog) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      posthog.captureException(error, { distinctId });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await posthog.shutdown();
    }
  }
};
