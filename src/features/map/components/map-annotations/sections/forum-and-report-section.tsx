'use client';

import { useOnlineStatus } from '@/hooks/use-online-status';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { handleLogin } from '@/utils/login-handler';
import { Flag, Loader2, LogIn, MessageCircleQuestion, WifiOff } from 'lucide-react';
import { useSession } from 'next-auth/react';
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

const loginToReportText: StaticTranslationString = {
  en: 'Log in to report an issue',
  de: 'Anmelden, um ein Problem zu melden',
  fr: 'Connectez-vous pour signaler un problème',
};

const loginToReportDescription: StaticTranslationString = {
  en: 'A report opens a chat with the camp team, which needs a Cevi.DB login.',
  de: 'Eine Meldung öffnet einen Chat mit dem Lagerteam, dafür brauchst du ein Login mit der Cevi.DB.',
  fr: "Un signalement ouvre un chat avec l'équipe du camp, ce qui nécessite une connexion Cevi.DB.",
};

const offlineText: StaticTranslationString = {
  de: 'Offline',
  en: 'Offline',
  fr: 'Hors ligne',
};

const offlineDescription: StaticTranslationString = {
  en: 'Internet connection required to report issues.',
  de: 'Internetverbindung erforderlich, um Probleme zu melden.',
  fr: 'Connexion Internet requise pour signaler des problèmes.',
};

export const AnnotationForumAndReportSection: React.FC<{
  coordinates: [number, number] | undefined;
}> = ({ coordinates }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const router = useRouter();
  const isOnline = useOnlineStatus();
  // A report is a chat, and a chat needs a login. A guest who sent one got a 401, which signs
  // the client out and sends it back to `/entrypoint`, out of the map they were using.
  const { status: sessionStatus } = useSession();
  const isGuest = sessionStatus === 'unauthenticated';
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  // ensure the report button state is reset on every mount
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setIsRedirecting(false), []);

  const {
    mutate: createReport,
    isPending,
    error: reportError,
  } = trpc.chat.reportProblem.useMutation({
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
    if (isOnline && isGuest) {
      return <LogIn size={16} className="text-orange-600" />;
    }
    if (isOnline) {
      return <Flag size={16} className="text-orange-600" />;
    }
    return <WifiOff size={16} className="text-gray-500" />;
  };

  let buttonText = reportIssueText;
  let buttonDescription = reportIssueDescription;
  if (!isOnline) {
    buttonText = offlineText;
    buttonDescription = offlineDescription;
  } else if (isGuest) {
    buttonText = loginToReportText;
    buttonDescription = loginToReportDescription;
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <MessageCircleQuestion size={18} className="text-conveniat-green" />
        <h3 className="text-conveniat-green font-semibold">conveniat27 Forum</h3>
      </div>
      <div className="space-y-2">
        <button
          onClick={() => {
            if (isGuest) {
              handleLogin('/entrypoint');
              return;
            }
            createReport({ location: coordinates });
          }}
          disabled={!isOnline || isPending || isRedirecting || sessionStatus === 'loading'}
          className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {getButtonIcon()}
          <div>
            <div className="font-medium text-gray-900">{buttonText[locale]}</div>
            <div className="text-sm text-gray-600">{buttonDescription[locale]}</div>
          </div>
        </button>
        {/* the server words the rate limit in the user's language, with what to do instead */}
        {reportError?.data?.code === 'TOO_MANY_REQUESTS' && (
          <p className="text-sm text-red-600">{reportError.message}</p>
        )}
      </div>
    </div>
  );
};
