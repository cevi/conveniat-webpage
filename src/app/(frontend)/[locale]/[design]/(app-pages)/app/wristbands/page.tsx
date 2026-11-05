import { WristbandsView } from '@/features/wristbands/components/wristbands-view';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { Metadata } from 'next';
import type React from 'react';

const tabTitle: StaticTranslationString = {
  de: 'Armbänder',
  en: 'Wristbands',
  fr: 'Bracelets',
};

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  return { title: tabTitle[locale] };
};

const WristbandsPage: React.FC = () => <WristbandsView />;

export default WristbandsPage;
