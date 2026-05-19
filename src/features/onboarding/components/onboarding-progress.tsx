'use client';

import { OnboardingStep } from '@/features/onboarding/types';
import { cn } from '@/utils/tailwindcss-override';
import { motion } from 'framer-motion';
import React from 'react';

const steps = [
  OnboardingStep.Initial,
  OnboardingStep.Login,
  OnboardingStep.PushNotifications,
  OnboardingStep.OfflineContent,
];

interface OnboardingProgressProperties {
  currentStep: OnboardingStep;
  onStepClick: (step: OnboardingStep) => void;
}

export const OnboardingProgress: React.FC<OnboardingProgressProperties> = ({
  currentStep,
  onStepClick,
}) => {
  // Determine step index. If checking, assume initial (0) to prevent layout jump/flash.
  let stepIndex = steps.indexOf(currentStep);
  if (stepIndex === -1 && currentStep === OnboardingStep.Checking) {
    stepIndex = 0;
  }

  return (
    <div className="flex w-full justify-center gap-4 py-8">
      {steps.map((step, index) => {
        const isActive = index === stepIndex;
        const isCompleted = index < stepIndex;

        return (
          <button
            key={step}
            onClick={() => onStepClick(step)}
            type="button"
            disabled={!isCompleted && !isActive}
            className={cn(
              'group relative flex items-center justify-center p-2 focus:outline-hidden',
              !isCompleted && !isActive ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            )}
          >
            <motion.div
              initial={false}
              animate={{
                width: isActive ? 24 : 12,
                height: 12,
                backgroundColor: isActive || isCompleted ? '#B91C1C' : '#D1D5DB', // red-700 : gray-300
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={cn(
                'rounded-full group-hover:bg-red-400 group-focus-visible:ring-2 group-focus-visible:ring-red-500',
                isActive && 'group-hover:bg-red-800',
              )}
            />
          </button>
        );
      })}
    </div>
  );
};
