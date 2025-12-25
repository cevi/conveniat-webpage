'use client';

import { OnboardingStep } from '@/features/onboarding/types';
import { cn } from '@/utils/tailwindcss-override';
import { motion } from 'framer-motion';
import React from 'react';

const steps = [OnboardingStep.Initial, OnboardingStep.Login, OnboardingStep.PushNotifications];

interface OnboardingProgressProperties {
  currentStep: OnboardingStep;
  onStepClick: (step: OnboardingStep) => void;
}

export const OnboardingProgress: React.FC<OnboardingProgressProperties> = ({
  currentStep,
  onStepClick,
}) => {
  // If we are in loading/checking state, don't show progress or just show empty?
  // Usually we might want to map these to specific indices.
  // Initial -> 0
  // Login -> 1
  // PushNotifications -> 2

  // Determine step index. If checking, assume initial (0) to prevent layout jump/flash.
  let stepIndex = steps.indexOf(currentStep);
  if (stepIndex === -1 && currentStep === OnboardingStep.Checking) {
    stepIndex = 0;
  }

  // If step is really not in the list (and not loading/checking), don't render?
  // But purely for progress, we might want to hide only if strictly unknown.
  // Actually, if Loading, stepIndex is -1. Layout should persist to avoid jump.
  // Ideally, if Loading, we might want to keep the LAST active step or just show empty?
  // For stability, let's keep rendering. If index is -1, all dots are gray, which is fine.

  // Previously: if (stepIndex === -1) return; -> This caused the "transparent/invisible" start.
  // Removal ensures it's always visible.

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
