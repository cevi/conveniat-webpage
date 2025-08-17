'use client';

import type { StaticTranslationString } from '@/types/types';
import { i18nConfig, type Locale } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

interface DescriptionInputProperties {
  value: string;
  onChange: (value: string) => void;
}

const imageDescription: StaticTranslationString = {
  en: 'Image Description',
  de: 'Bildbeschreibung',
  fr: "Description de l'image",
};

const descriptionPlaceholder: StaticTranslationString = {
  en: 'Please provide a detailed description of your images...',
  de: 'Bitte gib eine detaillierte Beschreibung deiner Bilder an...',
  fr: 'Veuillez fournir une description détaillée de vos images...',
};

export const DescriptionInput: React.FC<DescriptionInputProperties> = ({ value, onChange }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <div className="space-y-4">
      <label htmlFor="description" className="block text-base font-medium text-gray-700">
        {imageDescription[locale]} <span className="text-cevi-red">*</span>
      </label>
      <textarea
        id="description"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={descriptionPlaceholder[locale]}
        rows={4}
        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-500 shadow-sm transition-colors focus:border-gray-400 focus:outline-none"
      />
    </div>
  );
};
