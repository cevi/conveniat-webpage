import { isBuildPhase } from '@/utils/build-phase';
import { connection } from 'next/server';
import React, { Suspense } from 'react';
import 'server-only';

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

export { isBuildPhase } from '@/utils/build-phase';
