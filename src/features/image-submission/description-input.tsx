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
    <div className="space-y-2">
      <label htmlFor="description" className="block text-[13px] font-semibold text-green-900">
        {imageDescription[locale]} <span className="text-live">*</span>
      </label>
      <textarea
        id="description"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={descriptionPlaceholder[locale]}
        rows={4}
        className="bg-quiet focus:border-conveniat-green w-full resize-none rounded-xl border border-transparent px-3.5 py-3 text-[15px] text-green-900 transition-colors placeholder:text-green-500 focus:bg-white focus:outline-none"
      />
    </div>
  );
};
