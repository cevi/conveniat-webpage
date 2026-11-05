'use client';

import { IconTile } from '@/components/ui/icon-tile';
import { SectionLabel } from '@/components/ui/section-label';
import { forumMapText } from '@/features/map/components/forum/forum-map-texts';
import { composerHrefFor } from '@/features/map/utils/nearest-annotation';
import { useAuthStatus } from '@/hooks/use-auth-status';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { chatErrorTexts } from '@/lib/chat-error-texts';
import { FORUM_LIKE_EMOJI, forumStatusLabel } from '@/lib/forum-shared';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { handleLogin } from '@/utils/login-handler';
import { cn } from '@/utils/tailwindcss-override';
import { userErrorMessage } from '@/utils/user-error-message';
import { ChevronRight, Flag, Loader2, Lock, LogIn, Plus, ThumbsUp, WifiOff } from 'lucide-react';
import Link from 'next/link';
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
  en: 'Reports go to the forum and the camp team, which needs a Cevi.DB login.',
  de: 'Meldungen gehen ins Forum und ans Lagerteam, dafür brauchst du ein Login mit der Cevi.DB.',
  fr: "Les signalements vont au forum et à l'équipe du camp, ce qui nécessite une connexion Cevi.DB.",
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

const privateReportText: StaticTranslationString = {
  de: 'Privat an die Zentrale melden',
  en: 'Report privately to the Zentrale',
  fr: 'Signaler en privé à la Zentrale',
};

const rowClassName =
  'focus-visible:focus-surface border-line flex min-h-[60px] w-full cursor-pointer items-center gap-3 rounded-[14px] border bg-white px-3.5 py-2.5 text-left transition-colors hover:border-green-300 disabled:cursor-not-allowed disabled:opacity-60';

/** The big row of the section: what it does, a line on what it is for, and a chevron. */
const ActionRowContent: React.FC<{
  icon: React.ComponentProps<typeof IconTile>['icon'];
  spinning?: boolean;
  title: string;
  description: string;
}> = ({ icon, spinning = false, title, description }) => (
  <>
    <IconTile icon={icon} className={cn(spinning && '[&_svg]:animate-spin')} />
    <span className="min-w-0 flex-1">
      <span className="block text-[15px] leading-5 font-semibold text-green-900">{title}</span>
      <span className="block text-[13px] leading-[18px] text-balance text-green-700">
        {description}
      </span>
    </span>
    <ChevronRight className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />
  </>
);

/** The open posts about this place, each with "Ich auch", so nobody reports it a second time. */
const OpenPostsHere: React.FC<{ annotationId: string; locale: Locale }> = ({
  annotationId,
  locale,
}) => {
  const utils = trpc.useUtils();
  const { data } = trpc.forum.getForumPostList.useQuery({
    annotationId,
    status: 'active',
    limit: 5,
  });
  const like = trpc.chat.toggleReaction.useMutation({
    onSettled: () => void utils.forum.getForumPostList.invalidate(),
  });
  const posts = data?.items ?? [];
  if (posts.length === 0) return <></>;
  return (
    <ul className="border-line divide-line divide-y overflow-hidden rounded-[14px] border bg-white">
      {posts.map((post) => (
        <li key={post.id} className="flex min-h-14 items-center gap-2 py-1.5 pr-2 pl-3.5">
          <Link
            href={`/app/forum/${post.id}`}
            className="focus-visible:focus-surface min-w-0 flex-1"
          >
            <span className="text-heading block truncate text-[14px] font-semibold">
              {post.title}
            </span>
            <span className="text-[12px] text-green-700">
              {forumStatusLabel[post.status][locale]} · {post.likeCount} 👍
            </span>
          </Link>
          <button
            type="button"
            aria-pressed={post.likedByMe}
            disabled={like.isPending}
            onClick={() => like.mutate({ messageId: post.id, emoji: FORUM_LIKE_EMOJI })}
            className={cn(
              'focus-visible:focus-surface flex h-11 shrink-0 cursor-pointer items-center gap-1 rounded-xl border px-3 text-[13px] font-bold',
              post.likedByMe
                ? 'bg-conveniat-green border-conveniat-green text-white'
                : 'border-tint-line bg-tint text-conveniat-green',
            )}
          >
            <ThumbsUp
              className={cn('h-4 w-4', post.likedByMe && 'fill-current')}
              aria-hidden="true"
            />
            {forumMapText.meToo[locale]}
          </button>
        </li>
      ))}
    </ul>
  );
};

/**
 * Reporting a problem at a place of the map. Where the forum is on, what is already reported
 * here comes first, then a new post with the place filled in; the private support chat of
 * before stays as a quiet link, for what does not belong in public. Without the forum, the
 * report opens the support chat, as it always did.
 */
export const AnnotationForumAndReportSection: React.FC<{
  coordinates: [number, number] | undefined;
  annotation?: { id: string; title: string };
}> = ({ coordinates, annotation }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const router = useRouter();
  const isOnline = useOnlineStatus();
  // A report needs a login. A guest who sent one got a 401, which signs the client out and
  // sends it back to `/entrypoint`, out of the map they were using.
  const sessionStatus = useAuthStatus();
  const isGuest = sessionStatus === 'unauthenticated';
  const isSignedIn = sessionStatus === 'authenticated';
  const { data: dashboard } = trpc.appContent.getDashboardConfig.useQuery(
    { locale },
    { enabled: isSignedIn },
  );
  const forumEnabled = isSignedIn && dashboard?.featureFlags.forumEnabled !== false;
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
      console.error('Failed to create report:', error);
      setIsRedirecting(false);
    },
  });
  const isBusy = isPending || isRedirecting;
  const sendPrivateReport = (): void => createReport({ location: coordinates });

  let content: React.ReactNode;
  if (!isOnline || isGuest || sessionStatus === 'loading') {
    content = (
      <button
        type="button"
        onClick={() => handleLogin('/entrypoint')}
        disabled={!isOnline || sessionStatus === 'loading'}
        className={rowClassName}
      >
        <ActionRowContent
          icon={isOnline ? LogIn : WifiOff}
          title={isOnline ? loginToReportText[locale] : offlineText[locale]}
          description={isOnline ? loginToReportDescription[locale] : offlineDescription[locale]}
        />
      </button>
    );
  } else if (forumEnabled && coordinates !== undefined) {
    content = (
      <>
        {annotation !== undefined && <OpenPostsHere annotationId={annotation.id} locale={locale} />}
        <Link href={composerHrefFor(coordinates, annotation)} className={rowClassName}>
          <ActionRowContent
            icon={Plus}
            title={reportIssueText[locale]}
            description={forumMapText.newPostHere[locale]}
          />
        </Link>
        <button
          type="button"
          onClick={sendPrivateReport}
          disabled={isBusy}
          aria-busy={isBusy}
          className="focus-visible:focus-surface hover:bg-quiet flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold text-green-800 disabled:opacity-60"
        >
          {isBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Lock className="h-4 w-4" aria-hidden="true" />
          )}
          {privateReportText[locale]}
        </button>
      </>
    );
  } else {
    content = (
      <button
        type="button"
        onClick={sendPrivateReport}
        disabled={isBusy}
        aria-busy={isBusy}
        className={rowClassName}
      >
        <ActionRowContent
          icon={isBusy ? Loader2 : Flag}
          spinning={isBusy}
          title={reportIssueText[locale]}
          description={reportIssueDescription[locale]}
        />
      </button>
    );
  }

  return (
    <section className="space-y-2 pt-3 pb-4">
      <SectionLabel as="h3">{forumMapText.forum[locale]}</SectionLabel>
      {content}
      {/* the rate limit says what to do instead */}
      {reportError?.data?.code === 'TOO_MANY_REQUESTS' && (
        <p
          role="alert"
          className="bg-danger-soft text-danger-text rounded-xl px-3 py-2 text-[13px] font-medium"
        >
          {userErrorMessage(reportError, locale, chatErrorTexts)}
        </p>
      )}
    </section>
  );
};
