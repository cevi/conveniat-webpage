// next.config.ts loads this file through its own loader, which resolves `@/` from the project
// root even here, so `@/build` would look for src/src/build.
// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import build from './build';

/**
 * Identifies one build to the browser, as Next.js' `deploymentId`.
 *
 * During a rolling release two builds answer behind nginx at once. With an id, the router sends
 * it with every Flight request (`x-deployment-id`), which is what lets the proxy turn away a
 * request from a page of the other build before anything renders, see
 * `@/proxy/deployment-skew-proxy`.
 *
 * Version and commit name the build in logs. A build without a commit (a local `docker build`
 * of a checkout without `.git`) falls back to its build time, so two such builds still differ.
 * Next.js accepts only letters, digits, `-` and `_`, so the dots of the version become `_`.
 */
export const deploymentId: string = [
  build.version,
  build.git.hash === 'unknown' ? build.timestamp.replaceAll(/\D/g, '') : build.git.hash,
]
  .join('-')
  .replaceAll(/[^\w-]/g, '_');
