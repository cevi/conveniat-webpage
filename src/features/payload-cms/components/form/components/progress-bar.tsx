import type { FormSection } from '@/features/payload-cms/components/form/types';
import { type Locale, type StaticTranslationString } from '@/types/types';
import React from 'react';

const stepText: StaticTranslationString = {
  en: 'Step',
  de: 'Schritt',
  fr: 'Étape',
};

const ofText: StaticTranslationString = {
  en: 'of',
  de: 'von',
  fr: 'de',
};

interface ProgressBarProperties {
  locale: Locale;
  currentStepIndex: number;
  definedSteps: FormSection[];
  currentActualStep: FormSection;
}

export const ProgressBar: React.FC<ProgressBarProperties> = ({
  locale,
  currentStepIndex,
  definedSteps,
  currentActualStep,
}) => {
  return (
    <div className="mb-6">
      <div className="text-conveniat-green mb-2 flex justify-between text-sm font-medium">
        <span>
          {stepText[locale]} {currentStepIndex + 1} {ofText[locale]} {definedSteps.length}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className="bg-conveniat-green h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{
            width: `${((currentStepIndex + 1) / definedSteps.length) * 100}%`,
          }}
        />
      </div>
      <div className="mt-2 text-xs text-gray-600">
        {'sectionTitle' in currentActualStep && currentActualStep.sectionTitle}
      </div>
    </div>
  );
};
