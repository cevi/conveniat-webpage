'use client';

import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Flag, Loader2, MessageCircleQuestion } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useRouter } from 'next/navigation';
import React from 'react';

const reportIssueText: StaticTranslationString = {
  en: 'Report an Issue',
  de: 'Problem melden',
  fr: 'Signaler un problème',
};

const reportIssueDescription: StaticTranslationString = {
  en: 'Broken toilet, maintenance needed, etc.',
  de: 'Defekte Toilette, Wartung erforderlich usw.',
  fr: 'Toilettes cassées, maintenance nécessaire, etc.',
};

export const AnnotationForumAndReportSection: React.FC<{
  coordinates: [number, number] | undefined;
}> = ({ coordinates }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const { mutate: createReport, isPending } = trpc.chat.reportProblem.useMutation({
    onSuccess: (chat) => {
      setIsRedirecting(true);
      router.push(`/${locale}/app/chat/${chat.uuid}`);
    },
    onError: (error) => {
      // TODO: Toast or alert
      console.error('Failed to create report:', error);
      setIsRedirecting(false);
    },
  });

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <MessageCircleQuestion size={18} className="text-conveniat-green" />
        <h3 className="text-conveniat-green font-semibold">conveniat27 Forum</h3>
      </div>
      <div className="space-y-2">
        <button
          onClick={() => createReport({ location: coordinates })}
          disabled={isPending || isRedirecting}
          className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          {isPending || isRedirecting ? (
            <Loader2 className="animate-spin text-orange-600" size={16} />
          ) : (
            <Flag size={16} className="text-orange-600" />
          )}
          <div>
            <div className="font-medium text-gray-900"> {reportIssueText[locale]}</div>
            <div className="text-sm text-gray-600">{reportIssueDescription[locale]}</div>
          </div>
        </button>
      </div>
    </div>
  );
};
