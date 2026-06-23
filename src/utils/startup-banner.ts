import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const logStartupBanner = (): void => {
  let version = 'unknown';
  let commitHash = 'unknown';
  let gitBranch = 'unknown';

  // 1. Get version from package.json
  try {
    const packageJson = JSON.parse(
      readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
    ) as Record<string, unknown>;
    const packageVersion = packageJson['version'];
    if (typeof packageVersion === 'string' && packageVersion !== '') {
      version = packageVersion;
    }
  } catch {}

  // 2. Get git info from src/build.ts if it exists
  const buildPath = path.join(process.cwd(), 'src/build.ts');
  if (existsSync(buildPath)) {
    try {
      const buildContent = readFileSync(buildPath, 'utf8');
      const hashMatch = buildContent.match(/hash:\s*"(.*?)"/);
      const branchMatch = buildContent.match(/branch:\s*"(.*?)"/);
      if (hashMatch?.[1] !== undefined) commitHash = hashMatch[1];
      if (branchMatch?.[1] !== undefined) gitBranch = branchMatch[1];
    } catch {}
  }

  // 3. Fallback to direct Git command if build.ts isn't generated yet (e.g., local dev)
  if (commitHash === 'unknown') {
    try {
      commitHash = execSync('git rev-parse --short HEAD').toString().trim();
      gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    } catch {}
  }

  // 4. Colorized Console Output
  console.log(
    `\u001B[35m▲ conveniat27 v${version} (commit: ${commitHash} on branch: ${gitBranch})\u001B[0m`,
  );
};
