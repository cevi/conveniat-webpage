import type React from 'react';

/**
 * The full-height column every onboarding screen sits in: a 44px bar on top (way back, step,
 * language) and the step below it, whose actions end at the bottom edge within thumb reach.
 * The server-rendered loading screen uses it too, so nothing moves when the client takes over.
 */
export const OnboardingFrame: React.FC<{ header?: React.ReactNode; children: React.ReactNode }> = ({
  header,
  children,
}) => (
  <div className="mx-auto flex h-svh w-full max-w-md flex-col overflow-y-auto px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
    <div className="flex h-11 shrink-0 items-center gap-3">{header}</div>
    {children}
  </div>
);
