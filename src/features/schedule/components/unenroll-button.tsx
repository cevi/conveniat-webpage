'use client';
import { Button } from '@/components/ui/buttons/button';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

const unenrollText: StaticTranslationString = {
  de: 'Einschreibung löschen',
  en: 'Unenroll',
  fr: 'Se désinscrire',
};

export const UnenrollButton: React.FC<{
  courseId: string;
}> = ({ courseId }) => {
  const unenrollInCourse = trpc.schedule.unenrollFromCourse.useMutation();
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <Button
      className="bg-conveniat-green hover:bg-conveniat-green-dark text-white"
      onClick={() => unenrollInCourse.mutate({ courseId })}
    >
      {unenrollText[locale]}
    </Button>
  );
};
