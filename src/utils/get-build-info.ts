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
 * Cached with `cacheLife('max')`: the value only changes with a new build, and a
 * new build means a new container. It is read from several components across
 * multiple render passes, and formatting the timestamp is not free.
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
