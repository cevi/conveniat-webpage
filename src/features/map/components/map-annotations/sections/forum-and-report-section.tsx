'use client';

import { IconTile } from '@/components/ui/icon-tile';
import { SectionLabel } from '@/components/ui/section-label';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { handleLogin } from '@/utils/login-handler';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronRight, Flag, Loader2, LogIn, WifiOff } from 'lucide-react';
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

  let icon = Flag;
  if (isPending || isRedirecting) icon = Loader2;
  else if (!isOnline) icon = WifiOff;
  else if (isGuest) icon = LogIn;

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
    <section className="space-y-2 pt-3 pb-4">
      <SectionLabel as="h3">conveniat27 Forum</SectionLabel>
      <button
        type="button"
        onClick={() => {
          if (isGuest) {
            handleLogin('/entrypoint');
            return;
          }
          createReport({ location: coordinates });
        }}
        disabled={!isOnline || isPending || isRedirecting || sessionStatus === 'loading'}
        aria-busy={isPending || isRedirecting}
        className="border-line flex min-h-[60px] w-full cursor-pointer items-center gap-3 rounded-[14px] border bg-white px-3.5 py-2.5 text-left transition-colors hover:border-green-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <IconTile
          icon={icon}
          className={cn((isPending || isRedirecting) && '[&_svg]:animate-spin')}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-5 font-semibold text-green-900">
            {buttonText[locale]}
          </span>
          <span className="block text-[13px] leading-[18px] text-green-700">
            {buttonDescription[locale]}
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />
      </button>
      {/* the server words the rate limit in the user's language, with what to do instead */}
      {reportError?.data?.code === 'TOO_MANY_REQUESTS' && (
        <p
          role="alert"
          className="bg-danger-soft text-danger-text rounded-xl px-3 py-2 text-[13px] font-medium"
        >
          {reportError.message}
        </p>
      )}
    </section>
  );
};
