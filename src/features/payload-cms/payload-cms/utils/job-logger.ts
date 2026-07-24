/* eslint-disable n/no-process-env */
import os from 'node:os';

export const nodeName = process.env['NODE_NAME'] || os.hostname();

// Slugs of jobs queried in recent payload-jobs queries
let lastQueriedJobSlugs: string[] = [];

/**
 * Update the list of recently queried job slugs so logger hooks can associate job names with queue executions.
 */
export function setQueriedJobSlugs(slugs: string[]): void {
  if (slugs.length > 0) {
    lastQueriedJobSlugs = slugs;
  }
}

/**
 * Formats standard Payload CMS `Running N jobs.` log messages to include `<jobSlug/nodeName>` details in angled brackets.
 */
export function formatRunningJobsLogMessage(message: string): string {
  const match = /^Running (\d+) jobs?\.?$/i.exec(message);
  if (!match) return message;

  const countString = match[1] ?? '0';
  const count = Number.parseInt(countString, 10);
  let details = '';

  details = lastQueriedJobSlugs.length > 0 ? lastQueriedJobSlugs
      .slice(0, count)
      .map((slug) => `${slug}/${nodeName}`)
      .join(', ') : `node:${nodeName}`;

  return `Running ${count} jobs <${details}>.`;
}

/**
 * Custom logger configuration for Payload CMS to enrich job runner logs with angled bracket job/node details.
 */
export const customPayloadLoggerConfig = {
  options: {
    hooks: {
      logMethod(inputArguments: unknown[], method: (...args: unknown[]) => void): void {
        if (
          inputArguments.length > 0 &&
          typeof inputArguments[0] === 'object' &&
          inputArguments[0] !== null &&
          'msg' in inputArguments[0] &&
          typeof inputArguments[0].msg === 'string'
        ) {
          (inputArguments[0] as { msg: string }).msg = formatRunningJobsLogMessage(inputArguments[0].msg);
        }
        method.apply(this, inputArguments);
      },
    },
  },
};
