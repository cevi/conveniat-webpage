'use client';
import { IconTile } from '@/components/ui/icon-tile';
import type { StaticTranslationString } from '@/types/types';
import { i18nConfig, type Locale } from '@/types/types';
import { Image as LucideImageIcon } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

interface FileUploadZoneProperties {
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const selectImages: StaticTranslationString = {
  en: 'Select Images',
  de: 'Bilder auswählen',
  fr: 'Sélectionner des images',
};

const fileTypeText: StaticTranslationString = {
  en: 'Up to 50MB each',
  de: 'Bis zu 50MB pro Datei',
  fr: "Jusqu'à 50 Mo chacun",
};

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
          className="bg-quiet hover:bg-chip peer-focus-visible:ring-conveniat-green flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-green-900 transition-colors peer-focus-visible:ring-2"
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
        className="border-rail hover:bg-quiet peer-focus-visible:ring-conveniat-green flex cursor-pointer flex-col items-center gap-3 rounded-[14px] border-2 border-dashed bg-white px-6 py-10 text-center transition-colors peer-focus-visible:ring-2"
      >
        <IconTile icon={LucideImageIcon} size="lg" />
        <span className="font-heading text-heading text-lg font-bold">
          {selectImages[locale]} <span className="text-danger">*</span>
        </span>
        <span className="text-[13px] text-green-700">{fileTypeText[locale]}</span>
      </label>
    </div>
  );
};
