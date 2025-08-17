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
      className={`w-full rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none ${
        isDisabled || isLoading
          ? 'cursor-not-allowed bg-gray-300 text-gray-500'
          : 'transform cursor-pointer bg-blue-600 text-white hover:scale-[1.02] hover:bg-blue-700 focus:ring-blue-500 active:scale-[0.98]'
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
