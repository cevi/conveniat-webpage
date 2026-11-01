/**
 * `localStorage` key that is set while the onboarding has nothing left to show on this device.
 *
 * The entrypoint reads it in an inline script, before any JavaScript bundle runs, and goes
 * straight to the dashboard (see `EntrypointFastPath`). Leaving the entrypoint is a full page
 * load because it has a root layout of its own, so booting it only to find that nothing is left
 * to do cost a second page load on every app start. The checks it used to run on every start,
 * the session and push, run in the background of the app instead (`useOnboardingRecheck`), and
 * whatever they find removes the key, so the next start shows the onboarding step again.
 */
export const ONBOARDING_COMPLETE_KEY = 'onboarding-complete';

/** Records that the onboarding has nothing left to show. */
export const rememberOnboardingComplete = (): void => {
  try {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
  } catch {
    // without storage every start runs the onboarding, as before
  }
};

/** Makes the next start run the onboarding again. */
export const forgetOnboardingComplete = (): void => {
  try {
    localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
  } catch {
    // nothing stored, nothing to forget
  }
};
