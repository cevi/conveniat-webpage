import build from '@/build';

export async function register(): Promise<void> {
  console.log(
    `Registering OpenTelemetry instrumentation for ${build.version} (${build.git.hash}) on branch ${build.git.branch}`,
  );

  // eslint-disable-next-line n/no-process-env
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    await import('@/instrumentation.node');
  }
}
