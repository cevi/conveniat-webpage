import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { connection } from 'next/server';
import React, { Suspense } from 'react';
import 'server-only';

/**
 * Utility to determine if the current build is happening during the production build phase.
 * This can be useful for conditionally executing code that should only run during build time,
 * such as pre-rendering or static generation tasks.
 *
 * This is needed for example to check if we can initialize Payload CMS which is not
 * available during build-time pre-rendering, i.e., at build time we cannot use
 * `await getPayload({ config })` as it would error out.
 *
 * The usage of this function makes the page dynamic to avoid a static build-time pre-rendering
 * of any API routes, metadata, sitemaps, or manifests generator that bailout from caching
 * at build time. Use with caution, as it may impact performance unless the actual API call
 * is cached at runtime.
 *
 */
/**
 * Synchronous check for build phase.
 * Useful for top-level conditional logic where async `connection()` cannot be used.
 */
export const isBuildPhase = (): boolean =>
  // eslint-disable-next-line n/no-process-env
  process.env['NEXT_PHASE'] === PHASE_PRODUCTION_BUILD;

/**
 * Checks if we are in the build phase. If so, it opts into dynamic rendering (by awaiting `connection()`)
 * to prevent static generation failure for components needing unavailable resources (DB).
 * Returns true if in build phase (dynamic), false otherwise (static/cached).
 */
export const forceDynamicOnBuild = async (): Promise<boolean> => {
  if (isBuildPhase()) {
    await connection();
    return true;
  }

  return false;
};

const ForceDynamicOnBuildNotSuspended: React.FC<{ children: React.ReactNode }> = async ({
  children,
}) => {
  if (await forceDynamicOnBuild()) return <></>;
  return <>{children}</>;
};

/**
 * A React component that conditionally renders its children.
 * During build time, it forces dynamic rendering and renders nothing (to avoid DB calls).
 * During runtime (prod), it renders children normally allows caching.
 *
 * @constructor
 * @param props
 */
export const ForceDynamicOnBuild: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Suspense>
      <ForceDynamicOnBuildNotSuspended>{children}</ForceDynamicOnBuildNotSuspended>
    </Suspense>
  );
};
