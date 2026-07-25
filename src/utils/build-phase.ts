import { PHASE_PRODUCTION_BUILD } from 'next/constants';

/**
 * Utility to determine if the current build is happening during the production build phase.
 * This can be useful for conditionally executing code that should only run during build time,
 * such as pre-rendering or static generation tasks.
 *
 * This is needed for example to check if we can initialize Payload CMS which is not
 * available during build-time pre-rendering, i.e., at build time we cannot use
 * `await getPayload({ config })` as it would error out.
 */
/* eslint-disable n/no-process-env */
export const isBuildPhase = (): boolean =>
  process.env['NEXT_PHASE'] === PHASE_PRODUCTION_BUILD ||
  typeof process.env['DATABASE_URI'] !== 'string' ||
  process.env['DATABASE_URI'].trim() === '';
