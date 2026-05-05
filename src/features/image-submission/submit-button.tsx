'use client';

import type { StaticTranslationString } from '@/types/types';
import { i18nConfig, type Locale } from '@/types/types';
import { LoaderCircle } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

interface SubmitButtonProperties {
  isDisabled: boolean;
  fileCount: number;
  isLoading?: boolean;
}

const uploadButton: StaticTranslationString = {
  en: 'Upload Images',
  de: 'Bilder hochladen',
  fr: 'Télécharger les images',
};

export const SubmitButton: React.FC<SubmitButtonProperties> = ({
  isDisabled,
  fileCount,
  isLoading = false,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <button
      type="submit"
      disabled={isDisabled || isLoading}
      className={`w-full rounded-full px-4 py-3.5 text-base font-bold tracking-wide transition-all duration-300 focus:ring-4 focus:outline-none ${
        isDisabled || isLoading
          ? 'cursor-not-allowed bg-gray-200 text-gray-400'
          : 'bg-conveniat-green hover:bg-conveniat-green-dark focus:ring-conveniat-green/30 shadow-conveniat-green/20 transform cursor-pointer text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0'
      }`}
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          <span>Uploading...</span>
        </div>
      ) : (
        `${uploadButton[locale]} (${fileCount})`
      )}
    </button>
  );
};
