'use client';

import { ScheduleModalWrapper } from '@/features/schedule/components/schedule-modal-wrapper';
import { i18nConfig, type Locale } from '@/types/types';
import { Loader2 } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';

const labels = {
  loading: {
    de: 'Details werde geladen...',
    en: 'Loading details...',
    fr: 'Chargement des détails...',
  },
};

export default function Loading(): React.ReactNode {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <ScheduleModalWrapper
      title=""
      rightAction={<div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />}
    >
      <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-4 text-gray-500">
        <Loader2 className="text-conveniat-green h-12 w-12 animate-spin" />
        <span className="animate-pulse text-lg font-medium">{labels.loading[locale]}</span>
      </div>
    </ScheduleModalWrapper>
  );
}
