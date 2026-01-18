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

const dragDropText: StaticTranslationString = {
  en: 'Click to select images or drag and drop',
  de: 'Klicke, um Bilder auszuwählen oder ziehe sie per Drag & Drop',
  fr: 'Cliquez pour sélectionner des images ou glissez-déposez',
};

const fileTypeText: StaticTranslationString = {
  en: 'PNG, JPG, GIF up to 50MB each',
  de: 'PNG, JPG, GIF bis zu 50MB pro Datei',
  fr: "PNG, JPG, GIF jusqu'à 50 Mo chacun",
};

export const FileUploadZone: React.FC<FileUploadZoneProperties> = ({ onFileSelect }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <div className="space-y-4">
      <label className="block text-base font-medium text-gray-700">
        {selectImages[locale]} <span className="text-cevi-red">*</span>
      </label>
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors focus-within:border-gray-400 hover:border-gray-400">
        <input
          id="images"
          type="file"
          multiple
          accept="image/*"
          onChange={onFileSelect}
          className="sr-only"
        />
        <label htmlFor="images" className="flex cursor-pointer flex-col items-center gap-2">
          <LucideImageIcon className="h-12 w-12 text-gray-400" />
          <span className="text-sm text-gray-600">{dragDropText[locale]}</span>
          <span className="text-xs text-gray-500">{fileTypeText[locale]}</span>
        </label>
      </div>
    </div>
  );
};
