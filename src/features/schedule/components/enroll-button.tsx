'use client';
import { Button } from '@/components/ui/buttons/button';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

const enrollText: StaticTranslationString = {
  de: 'Einschreiben',
  en: 'Enroll',
  fr: "S'inscrire",
};

export const EnrollButton: React.FC<{
  courseId: string;
}> = ({ courseId }) => {
  const enrollInCourse = trpc.schedule.enrollInCourse.useMutation();
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <Button
      className="bg-conveniat-green hover:bg-conveniat-green-dark text-white"
      onClick={() => enrollInCourse.mutate({ courseId })}
    >
      {enrollText[locale]}
    </Button>
  );
};
