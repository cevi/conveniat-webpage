import type { Locale } from '@/types/types';
import { cacheLife } from 'next/cache';

interface BuildInfo {
  version: string;
  timestamp: string;
  git: { branch: string; hash: string };
}

/**
 * Retrieves the build information from the build file.
 *
 * The build file is generated during the build process and
 * contains information about the current build (git hash, timestamp, etc.).
 *
 * Cached with `'use cache'` because the result is constant for the lifetime of a
 * deployment: the build file is written at build time, and the only per-call
 * input is the locale used to format the timestamp.
 *
 * Without the cache this ran once per caller per render pass. A single traced
 * request to `/[locale]/[design]/app/schedule/[[...id]]` on konekta executed it
 * **8 times** for a combined 14.2 ms — the main menu, the footer and the
 * settings page each call it, and Next.js renders those across the metadata,
 * render and prerender passes. Almost all of that cost is
 * `toLocaleDateString` with an options object, which builds a fresh
 * `Intl.DateTimeFormat` every time.
 *
 * `cacheLife('max')` is deliberate: this value cannot change without a new
 * build, and a new build means a new container.
 *
 * @returns {BuildInfo | undefined} The build information or undefined if not found.
 *
 */
export const getBuildInfo = async (locale: Locale): Promise<BuildInfo | undefined> => {
  'use cache';
  cacheLife('max');

  try {
    // eslint-disable-next-line import/no-restricted-paths
    const { default: rawBuildInfo } = await import('@/build');

    // parse the timestamp from the build info
    const buildInfo = structuredClone(rawBuildInfo);
    buildInfo.timestamp = new Date(buildInfo.timestamp).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/Zurich',
    });

    return buildInfo;
  } catch {
    return;
  }
};
