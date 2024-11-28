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
    // @ts-ignore - ignore module not found error
    return (await import('@/build')).default as BuildInfo;
  } catch {
    console.error('Build information not found, build info not displayed.');
    return undefined;
  }
};
