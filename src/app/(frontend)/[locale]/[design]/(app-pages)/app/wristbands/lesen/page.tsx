import { ReaderView } from '@/features/wristbands/components/reader-view';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { Metadata } from 'next';
import type React from 'react';

const tabTitle: StaticTranslationString = {
  de: 'Armband lesen',
  en: 'Read a wristband',
  fr: 'Lire un bracelet',
};

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  return { title: tabTitle[locale] };
};

/** Security and first aid read a band here, also offline; the layout gates the feature. */
const ReadWristbandPage: React.FC = () => <ReaderView />;

export default ReadWristbandPage;
