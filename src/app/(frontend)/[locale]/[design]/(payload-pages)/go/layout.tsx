import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';
import { type ReactNode, Suspense } from 'react';

const resolveLinkTargetText: StaticTranslationString = {
  de: 'Link-Ziel wird aufgelöst...',
  en: 'Resolving Link Target...',
  fr: 'Résolution de la cible du lien...',
};

interface LayoutProperties {
  children: ReactNode;
  params: Promise<{ locale: Locale }>;
}

const GoSuspenseWrapper: React.FC<LayoutProperties> = async ({ children, params }) => {
  const { locale } = await params;
  return <Suspense fallback={<span>{resolveLinkTargetText[locale]}</span>}>{children}</Suspense>;
};

export default GoSuspenseWrapper;
