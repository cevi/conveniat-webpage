'use client';
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
  en: 'PNG, JPG, GIF up to 50MB each',
  de: 'PNG, JPG, GIF bis zu 50MB pro Datei',
  fr: "PNG, JPG, GIF jusqu'à 50 Mo chacun",
};

export const FileUploadZone: React.FC<FileUploadZoneProperties & { compact?: boolean }> = ({
  onFileSelect,
  compact = false,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  if (compact) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50/50 transition-all hover:border-blue-400/50 hover:bg-blue-50/50">
        <input
          id="images-compact"
          type="file"
          multiple
          accept="image/*"
          onChange={onFileSelect}
          className="sr-only"
        />
        <label
          htmlFor="images-compact"
          className="flex cursor-pointer items-center justify-center gap-3 p-4"
        >
          <LucideImageIcon className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-600 hover:text-blue-600">
            {selectImages[locale]}
          </span>
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block text-lg font-semibold text-gray-800">
        {selectImages[locale]} <span className="text-cevi-red">*</span>
      </label>
      <div className="group relative overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-10 text-center transition-all hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-lg">
        <input
          id="images"
          type="file"
          multiple
          accept="image/*"
          onChange={onFileSelect}
          className="sr-only"
        />
        <label htmlFor="images" className="flex cursor-pointer flex-col items-center gap-4 py-4">
          <div className="rounded-full bg-white p-4 shadow-sm transition-transform group-hover:scale-110 group-hover:shadow-md">
            <LucideImageIcon className="h-10 w-10 text-gray-400 group-hover:text-blue-500" />
          </div>
          <div className="space-y-1">
            <span className="block text-base font-medium text-gray-700 group-hover:text-blue-600">
              {selectImages[locale]}
            </span>
            <span className="block text-xs tracking-wide text-gray-400 uppercase">
              {fileTypeText[locale]}
            </span>
          </div>
        </label>
      </div>
    </div>
  );
};
