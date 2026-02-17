import { type Locale, type StaticTranslationString } from '@/types/types';
import React from 'react';

const nextStepText: StaticTranslationString = {
  en: 'Next',
  de: 'Weiter',
  fr: 'Suivant',
};

const previousStepText: StaticTranslationString = {
  en: 'Previous',
  de: 'Zurück',
  fr: 'Précédent',
};

const pleaseWaitText: StaticTranslationString = {
  en: 'Loading, please wait...',
  de: 'Laden, bitte warten...',
  fr: 'Chargement, veuillez patienter',
};

interface FormControlsProperties {
  locale: Locale;
  isFirst: boolean;
  isLast: boolean;
  isSubmitting: boolean;
  onNext: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onPrev: (event: React.MouseEvent<HTMLButtonElement>) => void;
  submitLabel?: string;
  formId?: string;
}

export const FormControls: React.FC<FormControlsProperties> = ({
  locale,
  isFirst,
  isLast,
  isSubmitting,
  onNext,
  onPrev,
  submitLabel,
  formId,
}) => {
  return (
    <div className="mt-6 flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
      {isFirst ? (
        <span className="hidden sm:block sm:w-1/3" />
      ) : (
        <button
          type="button"
          onClick={onPrev}
          disabled={isSubmitting}
          className="h-10 w-full cursor-pointer rounded-lg border-2 border-gray-500 px-5 py-2 text-base font-semibold text-gray-500 transition duration-100 hover:bg-gray-100 disabled:opacity-50 sm:w-auto"
        >
          {previousStepText[locale]}
        </button>
      )}

      {isLast ? (
        <button
          type="submit"
          disabled={isSubmitting}
          form={formId}
          className="bg-conveniat-green h-10 w-full cursor-pointer rounded-lg px-5 py-2 text-base font-bold text-gray-100 transition duration-100 hover:bg-green-700 disabled:opacity-50 sm:w-auto"
        >
          {isSubmitting ? pleaseWaitText[locale] : submitLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          disabled={isSubmitting}
          className="bg-conveniat-green h-10 w-full cursor-pointer rounded-lg px-5 py-2 text-base font-bold text-gray-100 transition duration-100 hover:bg-green-700 disabled:opacity-50 sm:w-auto"
        >
          {nextStepText[locale]}
        </button>
      )}
    </div>
  );
};
