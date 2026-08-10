/* eslint-disable n/no-process-env */
import os from 'node:os';

export const nodeName = process.env['NODE_NAME'] || os.hostname();

// Slugs of jobs queried in recent payload-jobs queries
let lastQueriedJobSlugs: string[] = [];

/**
 * Update the list of recently queried job slugs so logger hooks can associate job names with queue executions.
 */
export function setQueriedJobSlugs(slugs: string[]): void {
  lastQueriedJobSlugs = slugs;
}

/**
 * Formats standard Payload CMS `Running N jobs.` log messages to include `<jobSlug/nodeName>` details in angled brackets.
 */
export function formatRunningJobsLogMessage(message: string): string {
  const match = /^Running (\d+) jobs?\.?$/i.exec(message);
  if (!match) return message;

  const countString = match[1] ?? '0';
  const count = Number.parseInt(countString, 10);

  const slugs = lastQueriedJobSlugs;
  lastQueriedJobSlugs = [];

  const details =
    slugs.length > 0
      ? slugs
          .slice(0, count)
          .map((slug) => `${slug}/${nodeName}`)
          .join(', ')
      : `node:${nodeName}`;

  return `Running ${count} jobs <${details}>.`;
}

/**
 * Custom logger configuration for Payload CMS to enrich job runner logs with angled bracket job/node details.
 */
export const customPayloadLoggerConfig = {
  options: {
    hooks: {
      logMethod(inputArguments: unknown[], method: (...args: unknown[]) => void): void {
        if (inputArguments.length > 0) {
          const firstArgument = inputArguments[0];
          if (typeof firstArgument === 'string') {
            inputArguments[0] = formatRunningJobsLogMessage(firstArgument);
          } else if (
            typeof firstArgument === 'object' &&
            firstArgument !== null &&
            'msg' in firstArgument &&
            typeof (firstArgument as Record<string, unknown>)['msg'] === 'string'
          ) {
            const messageObject = firstArgument as Record<string, unknown> & { msg: string };
            messageObject.msg = formatRunningJobsLogMessage(messageObject.msg);
          }

          const secondArgument = inputArguments[1];
          if (typeof secondArgument === 'string') {
            inputArguments[1] = formatRunningJobsLogMessage(secondArgument);
          }
        }
        method.apply(this, inputArguments);
      },
    },
  },
};
