'use client';

import { useOnlineStatus } from '@/hooks/use-online-status';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Flag, Loader2, MessageCircleQuestion, WifiOff } from 'lucide-react';
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

const offlineText: StaticTranslationString = {
  de: 'Offline',
  en: 'Offline',
  fr: 'Hors ligne',
};

export const AnnotationForumAndReportSection: React.FC<{
  coordinates: [number, number] | undefined;
}> = ({ coordinates }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  // ensure the report button state is reset on every mount
  React.useEffect(() => setIsRedirecting(false), []);

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

  const getButtonIcon = (): React.ReactNode => {
    if (isPending || isRedirecting) {
      return <Loader2 className="animate-spin text-orange-600" size={16} />;
    }
    if (isOnline) {
      return <Flag size={16} className="text-orange-600" />;
    }
    return <WifiOff size={16} className="text-gray-500" />;
  };

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <MessageCircleQuestion size={18} className="text-conveniat-green" />
        <h3 className="text-conveniat-green font-semibold">conveniat27 Forum</h3>
      </div>
      <div className="space-y-2">
        <button
          onClick={() => createReport({ location: coordinates })}
          disabled={!isOnline || isPending || isRedirecting}
          className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {getButtonIcon()}
          <div>
            <div className="font-medium text-gray-900">
              {isOnline ? reportIssueText[locale] : offlineText[locale]}
            </div>
            <div className="text-sm text-gray-600">{reportIssueDescription[locale]}</div>
          </div>
        </button>
      </div>
    </div>
  );
};
