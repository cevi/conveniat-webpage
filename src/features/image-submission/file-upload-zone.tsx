'use client';
import { IconTile } from '@/components/ui/icon-tile';
import {
  MIN_IMAGE_LONG_SIDE,
  MIN_IMAGE_SHORT_SIDE,
} from '@/features/image-submission/image-requirements';
import { USER_IMAGE_MAX_BYTES } from '@/features/payload-cms/constants/user-image-upload';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { StaticTranslationString } from '@/types/types';
import { i18nConfig, type Locale } from '@/types/types';
import { Image as LucideImageIcon } from 'lucide-react';
import type React from 'react';

interface FileUploadZoneProperties {
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const selectImages: StaticTranslationString = {
  en: 'Select Images',
  de: 'Bilder auswählen',
  fr: 'Sélectionner des images',
};

const severalAtOnce: StaticTranslationString = {
  en: 'Several at once are fine',
  de: 'Mehrere auf einmal möglich',
  fr: 'Plusieurs à la fois possible',
};

const MAX_MEGABYTES = Math.round(USER_IMAGE_MAX_BYTES / (1024 * 1024));

// the limits a photo is checked against, said before anyone picks one
const requirements: StaticTranslationString[] = [
  {
    en: `from ${MIN_IMAGE_LONG_SIDE} × ${MIN_IMAGE_SHORT_SIDE} px`,
    de: `ab ${MIN_IMAGE_LONG_SIDE} × ${MIN_IMAGE_SHORT_SIDE} px`,
    fr: `dès ${MIN_IMAGE_LONG_SIDE} × ${MIN_IMAGE_SHORT_SIDE} px`,
  },
  {
    en: `up to ${MAX_MEGABYTES} MB`,
    de: `bis ${MAX_MEGABYTES} MB`,
    fr: `jusqu'à ${MAX_MEGABYTES} Mo`,
  },
];

export const FileUploadZone: React.FC<FileUploadZoneProperties & { compact?: boolean }> = ({
  onFileSelect,
  compact = false,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  if (compact) {
    return (
      <div className="relative">
        <input
          id="images-compact"
          type="file"
          multiple
          accept="image/*"
          onChange={onFileSelect}
          className="peer sr-only"
        />
        <label
          htmlFor="images-compact"
          className="bg-quiet hover:bg-chip peer-focus-visible:focus-ring flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-green-900 transition-colors"
        >
          <LucideImageIcon className="h-5 w-5" aria-hidden="true" />
          <span>{selectImages[locale]}</span>
        </label>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        id="images"
        type="file"
        multiple
        accept="image/*"
        onChange={onFileSelect}
        className="peer sr-only"
      />
      <label
        htmlFor="images"
        className="border-rail hover:bg-quiet peer-focus-visible:focus-ring flex cursor-pointer flex-col items-center gap-3 rounded-[14px] border-2 border-dashed bg-white px-6 py-10 text-center transition-colors"
      >
        <IconTile icon={LucideImageIcon} size="lg" />
        <span className="font-heading text-heading text-lg font-bold">{selectImages[locale]}</span>
        <span className="text-[13px] text-green-700">{severalAtOnce[locale]}</span>
        <span className="flex flex-wrap justify-center gap-1.5">
          {requirements.map((requirement) => (
            <span
              key={requirement.de}
              className="bg-chip rounded-md px-2 py-0.5 text-xs font-semibold text-green-900"
            >
              {requirement[locale]}
            </span>
          ))}
        </span>
      </label>
    </div>
  );
};
