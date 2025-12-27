'use client';

import { Button } from '@/components/ui/buttons/button';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { WifiOff } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

const enrollText: StaticTranslationString = {
  de: 'Einschreiben',
  en: 'Enroll',
  fr: "S'inscrire",
};

const offlineText: StaticTranslationString = {
  de: 'Offline',
  en: 'Offline',
  fr: 'Hors ligne',
};

export const EnrollButton: React.FC<{
  courseId: string;
}> = ({ courseId }) => {
  const enrollInCourse = trpc.schedule.enrollInCourse.useMutation();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const isOnline = useOnlineStatus();

  if (!isOnline) {
    return (
      <Button className="cursor-not-allowed bg-gray-200 text-gray-500" disabled>
        <WifiOff className="mr-2 h-4 w-4" />
        {offlineText[locale]}
      </Button>
    );
  }

  return (
    <Button
      className="bg-conveniat-green hover:bg-conveniat-green-dark text-white"
      onClick={() => enrollInCourse.mutate({ courseId })}
    >
      {enrollText[locale]}
    </Button>
  );
};
