'use client';

import { onboardingQuestionSteps } from '@/features/onboarding/components/onboarding-progress';
import type { OnboardingStep } from '@/features/onboarding/types';
import { useCallback, useState } from 'react';

const isQuestionStep = (step: OnboardingStep): boolean =>
  (onboardingQuestionSteps as readonly OnboardingStep[]).includes(step);

interface UseOnboardingBackResult {
  /** The step to show: the one the flow is on, or an earlier one the user went back to. */
  shownStep: OnboardingStep;
  canGoBack: boolean;
  goBack: () => void;
  /** Return to the step the flow is on; call it whenever the user answers a shown step. */
  returnToCurrent: () => void;
}

/**
 * The way back through the onboarding.
 *
 * The flow itself never goes back: it derives the step from what is stored (consent cookie,
 * session, push subscription, skip cookies). Going back therefore only shows an earlier step
 * again, one the user saw in this visit, and answering it stores the new answer the same way
 * as the first time, after which the flow picks up where it stands.
 */
export const useOnboardingBack = (step: OnboardingStep): UseOnboardingBackResult => {
  const [seenSteps, setSeenSteps] = useState<OnboardingStep[]>([]);
  const [lastStep, setLastStep] = useState<OnboardingStep | undefined>();
  const [revisitedStep, setRevisitedStep] = useState<OnboardingStep | undefined>();

  // Adjusted while rendering rather than in an effect, so the bar never shows a stale step.
  if (step !== lastStep) {
    setLastStep(step);
    setRevisitedStep(undefined);
    if (isQuestionStep(step) && !seenSteps.includes(step)) setSeenSteps([...seenSteps, step]);
  }

  const shownStep = revisitedStep ?? step;
  const shownIndex = seenSteps.indexOf(shownStep);
  const previousStep = shownIndex > 0 ? seenSteps[shownIndex - 1] : undefined;

  const goBack = useCallback((): void => {
    if (previousStep !== undefined) setRevisitedStep(previousStep);
  }, [previousStep]);

  const returnToCurrent = useCallback((): void => setRevisitedStep(undefined), []);

  return { shownStep, canGoBack: previousStep !== undefined, goBack, returnToCurrent };
};
