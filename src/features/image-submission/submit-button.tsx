'use client';

import { Button } from '@/components/ui/buttons/button';
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

const uploadingText: StaticTranslationString = {
  en: 'Uploading …',
  de: 'Wird hochgeladen …',
  fr: 'Téléchargement …',
};

export const SubmitButton: React.FC<SubmitButtonProperties> = ({
  isDisabled,
  fileCount,
  isLoading = false,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <Button
      type="submit"
      variant="primary"
      size="touch"
      className="w-full"
      disabled={isDisabled || isLoading}
    >
      {isLoading ? (
        <>
          <LoaderCircle className="animate-spin" aria-hidden="true" />
          {uploadingText[locale]}
        </>
      ) : (
        `${uploadButton[locale]} (${fileCount})`
      )}
    </Button>
  );
};
