'use client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePreviewMode } from '@/hooks/use-preview-mode';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

const enableString: StaticTranslationString = {
  de: 'Aktiviert',
  en: 'Enabled',
  fr: 'Activé',
};

const disabledString: StaticTranslationString = {
  de: 'Deaktiviert',
  en: 'Disabled',
  fr: 'Désactivé',
};

/**
 * Handles the change of the preview mode and updates the URL accordingly.
 */
/**
 * Handles the change of the preview mode and updates the URL accordingly.
 * Now uses the `usePreviewMode` custom hook for logic encapsulation.
 */
export const PreviewModeToggle: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { isInPreviewMode, togglePreviewMode } = usePreviewMode();

  return (
    <Select defaultValue={isInPreviewMode} onValueChange={togglePreviewMode}>
      <SelectTrigger className="flex h-7 items-center border-none bg-gray-900 px-2 text-xs text-gray-100">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="z-[250] bg-gray-900 p-2 text-gray-100">
        <SelectItem className="text-xs" value="enabled">
          {enableString[locale]}
        </SelectItem>
        <SelectItem className="text-xs" value="disabled">
          {disabledString[locale]}
        </SelectItem>
      </SelectContent>
    </Select>
  );
};
