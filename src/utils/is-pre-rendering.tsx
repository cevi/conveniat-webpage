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
export const isBuildTimePreRendering = async (): Promise<boolean> => {
  // eslint-disable-next-line n/no-process-env
  if (process.env['NEXT_PHASE'] === PHASE_PRODUCTION_BUILD) {
    await connection();
    return true;
  }

  return false;
};

const NoBuildTimePreRenderingNotSuspended: React.FC<{ children: React.ReactNode }> = async ({
  children,
}) => {
  if (await isBuildTimePreRendering()) return <></>;
  return <>{children}</>;
};

/**
 * A React component that conditionally renders its children based on whether the current
 * execution context is during build-time pre-rendering. If it is build-time pre-rendering,
 * the component renders nothing; otherwise, it renders its children.
 *
 * This is useful for avoiding rendering certain parts of the UI that depend on
 * runtime data or APIs that are not available during build-time pre-rendering. For example,
 * it can be used to skip rendering components that rely on Payload CMS data fetching
 * during the static generation phase, i.e., at build time we cannot use
 * `await getPayload({ config })` as it would error out.
 *
 * @constructor
 * @param props
 */
export const NoBuildTimePreRendering: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Suspense>
      <NoBuildTimePreRenderingNotSuspended>{children}</NoBuildTimePreRenderingNotSuspended>
    </Suspense>
  );
};
