'use client';

import { OnboardingStep } from '@/features/onboarding/types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

/** The steps a user answers, in the order the flow asks them. */
export const onboardingQuestionSteps = [
  OnboardingStep.Initial,
  OnboardingStep.Login,
  OnboardingStep.PushNotifications,
  OnboardingStep.OfflineContent,
] as const;

const stepOfText: StaticTranslationString = {
  de: 'Schritt {step} von {total}',
  en: 'Step {step} of {total}',
  fr: 'Étape {step} sur {total}',
};

interface OnboardingProgressProperties {
  currentStep: OnboardingStep;
  locale: Locale;
}

/**
 * Where the user is in the flow: "Schritt 2 von 4" over a bar of four segments. A step the flow
 * skipped on its own (already logged in, notifications already on) counts as done. Screens that
 * are not a question (loading, no connection) keep the space but show nothing.
 */
export const OnboardingProgress: React.FC<OnboardingProgressProperties> = ({
  currentStep,
  locale,
}) => {
  const stepIndex = (onboardingQuestionSteps as readonly OnboardingStep[]).indexOf(currentStep);
  if (stepIndex === -1) return <div className="flex-1" />;

  const total = onboardingQuestionSteps.length;
  const label = stepOfText[locale]
    .replace('{step}', String(stepIndex + 1))
    .replace('{total}', String(total));

  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <p className="text-center text-[13px] font-semibold text-green-700">{label}</p>
      <div className="flex gap-1.5" aria-hidden="true">
        {onboardingQuestionSteps.map((step, index) => (
          <span
            key={step}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors duration-300',
              index <= stepIndex ? 'bg-conveniat-green' : 'bg-chip',
            )}
          />
        ))}
      </div>
    </div>
  );
};
