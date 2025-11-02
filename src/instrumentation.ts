import build from '@/build';
import { sdk } from '@/tracing';

export function register(): void {
  // start the SDK
  console.log(
    `Starting OpenTelemetry SDK for ${build.version} (${build.git.hash}) on branch ${build.git.branch}`,
  );

  sdk.start();
}
