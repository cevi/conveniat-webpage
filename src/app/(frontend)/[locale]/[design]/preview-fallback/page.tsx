import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { Loader2 } from 'lucide-react';
import React from 'react';

const loadingText: StaticTranslationString = {
  de: 'Generiere Vorschau...',
  en: 'Generating preview...',
  fr: "Génération de l'aperçu...",
};

export function generateStaticParams(): { locale: string; design: string }[] {
  const designs = Object.values(DesignCodes);
  return designs.flatMap((design) => i18nConfig.locales.map((locale) => ({ locale, design })));
}

export default async function PreviewFallbackPage({
  params,
}: {
  params: Promise<{ locale: Locale; design: DesignCodes }>;
}): Promise<React.JSX.Element> {
  const { locale } = await params;
  const label = loadingText[locale];

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50 text-gray-500">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
