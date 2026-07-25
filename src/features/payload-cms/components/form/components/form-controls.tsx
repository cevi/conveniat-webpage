import { type Locale, type StaticTranslationString } from '@/types/types';
import React, { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

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

const uploadingText: StaticTranslationString = {
  en: 'Uploading file...',
  de: 'Datei wird hochgeladen...',
  fr: 'Téléversement du fichier...',
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
  const { control } = useFormContext();
  const formValues = useWatch({ control }) as Record<string, unknown> | undefined;

  const isFileUploading = useMemo(() => {
    if (formValues === undefined) {
      return false;
    }
    return Object.entries(formValues).some(
      ([key, value]) => key.startsWith('_isUploading_') && value === true,
    );
  }, [formValues]);

  const isDisabled = isSubmitting || isFileUploading;

  const getActionButtonLabel = (defaultLabel: string): string => {
    if (isSubmitting) return pleaseWaitText[locale];
    if (isFileUploading) return uploadingText[locale];
    return defaultLabel;
  };

  return (
    <div className="mt-2 flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
      {isFirst ? (
        <span className="hidden sm:block sm:w-1/3" />
      ) : (
        <button
          type="button"
          onClick={onPrev}
          disabled={isDisabled}
          className="flex h-auto min-h-10 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-gray-500 px-4 py-2 text-center text-sm font-semibold text-gray-500 transition duration-100 hover:bg-gray-100 disabled:opacity-50 sm:w-auto sm:text-base"
        >
          {previousStepText[locale]}
        </button>
      )}

      {isLast ? (
        <button
          type="submit"
          disabled={isDisabled}
          form={formId}
          className="bg-conveniat-green flex h-auto min-h-10 w-full cursor-pointer items-center justify-center rounded-lg px-4 py-2 text-center text-sm font-bold text-gray-100 transition duration-100 hover:bg-green-700 disabled:opacity-50 sm:w-auto sm:text-base"
        >
          {getActionButtonLabel(submitLabel ?? '')}
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          disabled={isDisabled}
          className="bg-conveniat-green flex h-auto min-h-10 w-full cursor-pointer items-center justify-center rounded-lg px-4 py-2 text-center text-sm font-bold text-gray-100 transition duration-100 hover:bg-green-700 disabled:opacity-50 sm:w-auto sm:text-base"
        >
          {getActionButtonLabel(nextStepText[locale])}
        </button>
      )}
    </div>
  );
};
