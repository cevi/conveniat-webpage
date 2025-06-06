'use client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

/**
 * Handles the change of the preview mode and updates the URL accordingly.
 */
export const PreviewModeToggle: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const searchParameters = useSearchParams();
  const router = useRouter();

  const [isInPreviewMode, setIsInPreviewMode] = useState<string | undefined>();

  useEffect(() => {
    const previewParameter = searchParameters.get('preview');
    setIsInPreviewMode(previewParameter === 'true' ? 'enabled' : 'disabled');
  }, [searchParameters]);

  const handlePreviewModeChange = (value: string): void => {
    const newUrl = new URL(globalThis.location.href);

    if (value === 'enabled') {
      newUrl.searchParams.set('preview', 'true');
      router.push(newUrl.toString());
    } else {
      newUrl.searchParams.delete('preview');
      router.push(newUrl.toString());
    }
  };

  if (isInPreviewMode === undefined) {
    return <></>;
  }

  const StaticTranslationStrings = {
    enabled: {
      de: 'Aktiviert',
      en: 'Enabled',
      fr: 'Activé',
    },
    disabled: {
      de: 'Deaktiviert',
      en: 'Disabled',
      fr: 'Désactivé',
    },
  };

  return (
    <Select defaultValue={isInPreviewMode} onValueChange={handlePreviewModeChange}>
      <SelectTrigger className="flex h-7 items-center border-none bg-gray-900 px-2 text-xs text-gray-100">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="z-[250] bg-gray-900 p-2 text-gray-100">
        <SelectItem className="text-xs" value="enabled">
          {StaticTranslationStrings.enabled[locale]}
        </SelectItem>
        <SelectItem className="text-xs" value="disabled">
          {StaticTranslationStrings.disabled[locale]}
        </SelectItem>
      </SelectContent>
    </Select>
  );
};
