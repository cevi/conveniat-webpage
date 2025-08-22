import build from '@/build';
import { sdk } from '@/tracing';

export async function register(): Promise<void> {
  // start the SDK
  console.log(
    `Starting OpenTelemetry SDK for ${build.version} (${build.git.hash}) on branch ${build.git.branch}`,
  );

  sdk.start();

  // gracefully shut down the SDK on process exit
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.debug('Tracing terminated'))
      .catch((error: unknown) => console.error('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });
}
