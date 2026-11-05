import { environmentVariables } from '@/config/environment-variables';
import { SignInToWristbands } from '@/features/wristbands/components/sign-in-to-wristbands';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { io } from 'next/cache';
import { notFound } from 'next/navigation';
import type React from 'react';
import { Suspense } from 'react';

/**
 * Lets the wristband pages through only where the deployment enabled them, and only signed in:
 * bands are programmed and read by people who are, so a guest gets the login instead of
 * "Band programmieren" or "Armband lesen". `io()` keeps the flag a runtime decision, the way
 * the material depot's layout does: prerendered at build time, where the flag is unset, the
 * route would be a 404 on every deployment.
 */
const WristbandsFeatureGate: React.FC<{ children: React.ReactNode }> = async ({ children }) => {
  await io();
  if (!environmentVariables.FEATURE_ENABLE_NFC_WRISTBANDS) notFound();
  const session = await auth();
  if (!isValidNextAuthUser(session?.user)) return <SignInToWristbands />;
  return children;
};

const WristbandsLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-page min-h-dvh">
    <div className="mx-auto max-w-xl px-4 pt-4 pb-10">
      <Suspense>
        <WristbandsFeatureGate>{children}</WristbandsFeatureGate>
      </Suspense>
    </div>
  </div>
);

export default WristbandsLayout;
