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
 * @returns {BuildInfo | undefined} The build information or undefined if not found.
 *
 */
export const getBuildInfo = async (): Promise<BuildInfo | undefined> => {
  try {
    const { default: rawBuildInfo } = (await import('@/build')) as {
      default: BuildInfo;
    };

    // parse the timestamp from the build info
    // TODO: make localized..
    const buildInfo = structuredClone(rawBuildInfo);
    buildInfo.timestamp = new Date(buildInfo.timestamp).toLocaleDateString('de', {
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
    console.error('Build information not found, build info not displayed.');
    return undefined;
  }
};
