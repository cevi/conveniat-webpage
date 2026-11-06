'use client';
import { IconTile } from '@/components/ui/icon-tile';
import { SectionLabel } from '@/components/ui/section-label';
import { forumMapText } from '@/features/map/components/forum/forum-map-texts';
import { composerHrefFor } from '@/features/map/utils/nearest-annotation';
import { useAuthStatus } from '@/hooks/use-auth-status';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToggleForumLike } from '@/hooks/use-toggle-forum-like';
import { FORUM_LIKE_EMOJI, forumStatusLabel } from '@/lib/forum-shared';
import { useTRPC } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { handleLogin } from '@/utils/login-handler';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronRight, Lock, LogIn, Plus, ThumbsUp, WifiOff } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { useQuery } from '@tanstack/react-query';

const reportIssueText: StaticTranslationString = {
  en: 'Report an Issue',
  de: 'Problem melden',
  fr: 'Signaler un problème',
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
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <>
    <IconTile icon={icon} />
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
  const trpc = useTRPC();
  const { data } = useQuery(
    trpc.forum.getForumPostList.queryOptions({
      annotationId,
      status: 'active',
      limit: 5,
    }),
  );
  const like = useToggleForumLike();
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
 * Reporting a problem at a place of the map, in the forum: what is already reported here comes
 * first, then a new post with the place filled in, and the private report to the Zentrale, the
 * same composer switched to "Privat", for what does not belong in public. Hidden while the forum
 * is off, since the forum is where every report goes.
 */
export const AnnotationForumAndReportSection: React.FC<{
  coordinates: [number, number] | undefined;
  annotation?: { id: string; title: string };
}> = ({ coordinates, annotation }) => {
  const trpc = useTRPC();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const isOnline = useOnlineStatus();
  // A report needs a login. A guest who sent one got a 401, which signs the client out and
  // sends it back to `/entrypoint`, out of the map they were using.
  const sessionStatus = useAuthStatus();
  const isGuest = sessionStatus === 'unauthenticated';
  const isSignedIn = sessionStatus === 'authenticated';
  const { data: dashboard } = useQuery(
    trpc.appContent.getDashboardConfig.queryOptions({ locale }, { enabled: isSignedIn }),
  );
  const forumEnabled = dashboard?.featureFlags.forumEnabled !== false;
  const { data: settings } = useQuery(
    trpc.forum.getForumSettings.queryOptions({}, { enabled: isSignedIn && forumEnabled }),
  );

  if (coordinates === undefined || (isSignedIn && !forumEnabled)) return <></>;

  const content =
    !isOnline || isGuest || sessionStatus === 'loading' ? (
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
    ) : (
      <>
        {annotation !== undefined && <OpenPostsHere annotationId={annotation.id} locale={locale} />}
        <Link href={composerHrefFor(coordinates, annotation)} className={rowClassName}>
          <ActionRowContent
            icon={Plus}
            title={reportIssueText[locale]}
            description={forumMapText.newPostHere[locale]}
          />
        </Link>
        {/* absent in a persisted cache from before private reports */}
        {settings?.privateReportsAvailable === true && (
          <Link
            href={composerHrefFor(coordinates, annotation, undefined, { private: true })}
            className="focus-visible:focus-surface hover:bg-quiet flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold text-green-800"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            {privateReportText[locale]}
          </Link>
        )}
      </>
    );

  return (
    <section className="space-y-2 pt-3 pb-4">
      <SectionLabel as="h3">{forumMapText.forum[locale]}</SectionLabel>
      {content}
    </section>
  );
};
