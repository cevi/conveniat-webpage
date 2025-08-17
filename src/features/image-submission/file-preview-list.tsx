'use client';

import type { StaticTranslationString } from '@/types/types';
import { i18nConfig, type Locale } from '@/types/types';
import { Image as LucideImageIcon, Trash2 } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

interface FilePreviewListProperties {
  files: File[];
  onRemoveFile: (index: number) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, index)).toFixed(2)} ${sizes[index]}`;
};

const selectedImages: StaticTranslationString = {
  en: 'Selected Images',
  de: 'Ausgewählte Bilder',
  fr: 'Images sélectionnées',
};

export const FilePreviewList: React.FC<FilePreviewListProperties> = ({ files, onRemoveFile }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  if (files.length === 0) return <></>;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {selectedImages[locale]} ({files.length})
      </label>
      <div className="max-h-40 space-y-2 overflow-y-auto">
        {files.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="flex items-center justify-between rounded border bg-gray-50 p-2 transition-colors hover:bg-gray-100"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <LucideImageIcon className="h-4 w-4 text-gray-400" />

              <span className="truncate text-sm">{file.name}</span>
              <span className="flex-shrink-0 text-xs text-gray-500">
                {formatFileSize(file.size)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onRemoveFile(index)}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:ring-2 focus:ring-red-500 focus:outline-none"
              aria-label={`Remove ${file.name}`}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
