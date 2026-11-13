'use client';
import { AppFooterController } from '@/components/footer/hide-footer-context';
import { OfflineBanner } from '@/components/offline-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { SectionLabel } from '@/components/ui/section-label';
import type { ForumPostDetail } from '@/features/chat/api/forum/forum-queries';
import type { ChatMessage } from '@/features/chat/api/types';
import { ChatComposerBar } from '@/features/chat/components/chat-view/chat-client-component';
import { ChatTextAreaInput } from '@/features/chat/components/chat-view/chat-text-area-input';
import { MessageList } from '@/features/chat/components/chat-view/message-list';
import { ChatImage } from '@/features/chat/components/chat-view/message/chat-image';
import { ForumDoneSheet } from '@/features/chat/components/forum/forum-done-sheet';
import { ForumFlagSheet } from '@/features/chat/components/forum/forum-flag-sheet';
import type { RemoveTarget } from '@/features/chat/components/forum/forum-moderation-sheet';
import { ForumModerationSheet } from '@/features/chat/components/forum/forum-moderation-sheet';
import {
  ForumEditPostSheet,
  RemovalBanner,
} from '@/features/chat/components/forum/forum-post-removal';
import { ForumStatusPill } from '@/features/chat/components/forum/forum-status-pill';
import {
  campTimeText,
  forumText,
  relativeTimeText,
} from '@/features/chat/components/forum/forum-texts';
import { KernteamBadge } from '@/features/chat/components/forum/kernteam-badge';
import { useForumStatusFailure } from '@/features/chat/components/forum/use-forum-status-outbox';
import type { ExtraMessageAction } from '@/features/chat/context/chat-actions-context';
import { ChatActionsProvider } from '@/features/chat/context/chat-actions-context';
import { ChatIdProvider } from '@/features/chat/context/chat-id-context';
import { useChatSSE } from '@/features/chat/hooks/use-chat-sse';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useToggleForumLike } from '@/hooks/use-toggle-forum-like';
import { forumErrorTexts } from '@/lib/forum-error-texts';
import {
  FORUM_LIKE_EMOJI,
  forumCapacityLabel,
  forumFlagReasonLabel,
  forumKindLabel,
  forumLikeLabel,
  forumStatusLabel,
} from '@/lib/forum-shared';
import { useTRPC } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { userErrorMessage } from '@/utils/user-error-message';
import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Eye,
  EyeOff,
  Flag,
  Forward,
  Hand,
  Loader2,
  Lock,
  MapPin,
  MessageSquareOff,
  MoreVertical,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/** `…/app/forum/<postId>`; the composer's `new` is a page of its own. */
const POST_ID_FROM_PATHNAME = /\/app\/forum\/([\da-f-]{36})\/?$/i;

/**
 * The post the URL names. Read in the browser, like a chat: the service worker replays one
 * shell for every post, so the page must not depend on its params.
 */
/** Where the post's back button leads: the forum, or the Zentrale's queue the post came from. */
const BackHrefContext = React.createContext('/app/forum');

/** The path of the Zentrale, which sends `?from=zentrale` along to the posts it opens. */
export const ZENTRALE_PATH = '/app/forum/zentrale';

const usePostIdFromPath = (): string | undefined => {
  const pathname = usePathname();
  return POST_ID_FROM_PATHNAME.exec(pathname)?.[1];
};

const screenClassName =
  'bg-page fixed top-(--app-top-inset) z-[110] flex h-[calc(100dvh-var(--app-top-inset))] w-screen flex-col overflow-y-hidden xl:absolute xl:inset-0 xl:z-0 xl:h-auto xl:w-auto';

const ScreenHeader: React.FC<{
  title: string;
  locale: Locale;
  actions?: React.ReactNode;
}> = ({ title, locale, actions }) => {
  const router = useRouter();
  const backHref = React.useContext(BackHrefContext);
  return (
    <div className="border-line flex h-[60px] shrink-0 items-center gap-1 border-b bg-white pr-2 pl-1">
      <button
        type="button"
        onClick={() => router.push(backHref)}
        className="focus-visible:focus-surface hover:bg-quiet flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-green-900"
        aria-label={forumText.back[locale]}
      >
        <ArrowLeft className="h-[22px] w-[22px]" aria-hidden="true" />
      </button>
      <h1 className="font-heading text-heading min-w-0 flex-1 truncate pl-1 text-[17px] font-bold">
        {title}
      </h1>
      {actions}
    </div>
  );
};

/** Where the post's place opens: the map entry it belongs to, or the spot on the forum layer. */
const mapHrefOf = (post: ForumPostDetail): string =>
  post.location?.annotationId == undefined
    ? `/app/map?forumPost=${post.id}`
    : `/app/map?locationId=${post.location.annotationId}`;

/** What a queued status change that the server refused says, by its reason. */
const failureText = (reason: string, locale: Locale): string =>
  reason in forumErrorTexts
    ? forumErrorTexts[reason as keyof typeof forumErrorTexts][locale]
    : forumText.changeFailed[locale];

/**
 * A post waiting for approval: its author reads who will approve it, a moderator approves it
 * or rejects it, which deletes it. Rejecting asks first, as every deletion does.
 */
const PendingBanner: React.FC<{ post: ForumPostDetail; locale: Locale }> = ({ post, locale }) => {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmReject, setConfirmReject] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const fail = (caught: unknown): void =>
    setError(userErrorMessage(caught, locale, forumErrorTexts, forumText.changeFailed));
  const approve = useMutation(
    trpc.forum.approveForumPost.mutationOptions({
      onSuccess: () => void queryClient.invalidateQueries(trpc.forum.pathFilter()),
      onError: fail,
    }),
  );
  const reject = useMutation(
    trpc.forum.removeForumMessage.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.forum.pathFilter());
        router.push('/app/forum');
      },
      onError: fail,
    }),
  );

  return (
    <div className="bg-quiet flex flex-col gap-2.5 rounded-xl p-3">
      <p className="flex items-start gap-2 text-[14px] text-green-900">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-green-700" aria-hidden="true" />
        <span className="text-balance">
          {post.viewer.canApprove
            ? forumText.pendingModerator[locale]
            : forumText.pendingAuthor[locale]}
        </span>
      </p>
      {post.viewer.canApprove && confirmReject && (
        <p className="text-[13px] text-green-800">{forumText.rejectConfirm[locale]}</p>
      )}
      {post.viewer.canApprove && (
        <div className="flex gap-2">
          {confirmReject ? (
            <>
              <button
                type="button"
                onClick={() => setConfirmReject(false)}
                className="bg-chip focus-visible:focus-surface h-11 flex-1 cursor-pointer rounded-xl text-[15px] font-semibold text-green-900"
              >
                {forumText.cancel[locale]}
              </button>
              <button
                type="button"
                disabled={reject.isPending}
                onClick={() =>
                  reject.mutate({ messageId: post.id, kind: 'DELETED', reason: 'OTHER' })
                }
                className="border-danger-line text-danger-text hover:bg-danger-soft focus-visible:focus-surface-danger h-11 flex-1 cursor-pointer rounded-xl border bg-white text-[15px] font-semibold"
              >
                {forumText.reject[locale]}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setConfirmReject(true)}
                className="border-danger-line text-danger-text hover:bg-danger-soft focus-visible:focus-surface-danger h-11 flex-1 cursor-pointer rounded-xl border bg-white text-[15px] font-semibold"
              >
                {forumText.reject[locale]}
              </button>
              <button
                type="button"
                disabled={approve.isPending}
                onClick={() => approve.mutate({ postId: post.id })}
                className="bg-conveniat-green focus-visible:focus-surface-filled flex h-11 flex-[2] cursor-pointer items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                {forumText.approve[locale]}
              </button>
            </>
          )}
        </div>
      )}
      {error !== undefined && (
        <p
          role="alert"
          className="bg-danger-soft text-danger-text rounded-lg px-3 py-2 text-[13px]"
        >
          {error}
        </p>
      )}
    </div>
  );
};

/** The answer the Kernteam marked, above the other comments. */
const MarkedAnswer: React.FC<{ commentId: string; locale: Locale }> = ({ commentId, locale }) => {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.chat.getMessage.queryOptions({ messageId: commentId }));
  if (data === undefined) return <></>;
  const payload = data.messagePayload as { text?: unknown } | undefined;
  const text = typeof payload?.text === 'string' ? payload.text : '';
  return (
    <div className="border-tint-line bg-tint rounded-xl border p-3">
      {/* wraps, so a long function moves to its own line instead of being cut */}
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] font-semibold text-green-800">
        <CheckCircle2 className="text-conveniat-green h-4 w-4" aria-hidden="true" />
        {forumText.answer[locale]} · {data.senderName ?? ''}
        {data.byTopicAdmin === true && (
          <KernteamBadge
            locale={locale}
            label={data.kernteamLabel}
            className="max-w-full shrink-0"
          />
        )}
      </p>
      <p className="mt-1 text-[14px] leading-[1.45] whitespace-pre-wrap text-green-900">{text}</p>
    </div>
  );
};

const buttonClassName =
  'focus-visible:focus-surface flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl text-[15px] font-semibold disabled:opacity-50';
const primaryClassName = cn(
  buttonClassName,
  'bg-conveniat-green focus-visible:focus-surface-filled text-white hover:bg-green-700',
);
const outlinedClassName = cn(
  buttonClassName,
  'border-line hover:bg-quiet border bg-white text-green-900',
);

/**
 * What the Zentrale does with a post: take it ("Ich übernehme"), so nobody answers it twice, and
 * forward it to a Ressort, a person or another topic. Shows who handles it, for everyone who
 * handles posts; a participant sees none of it.
 */
const ZentraleActions: React.FC<{
  post: ForumPostDetail;
  locale: Locale;
  currentUserId: string | undefined;
  onForward: () => void;
}> = ({ post, locale, currentUserId, onForward }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | undefined>();
  const refresh = (): void => void queryClient.invalidateQueries(trpc.forum.pathFilter());
  const fail = (caught: unknown): void =>
    setError(userErrorMessage(caught, locale, forumErrorTexts, forumText.changeFailed));
  const claim = useMutation(
    trpc.forum.claimForumPost.mutationOptions({ onSuccess: refresh, onError: fail }),
  );
  const giveBack = useMutation(
    trpc.forum.endForumPostAssignment.mutationOptions({
      onSuccess: refresh,
      onError: fail,
    }),
  );

  // absent in a persisted cache from before the Zentrale
  const current = post.claim ?? null;
  const isMine = current !== null && current.by.id === currentUserId;
  const canClaim = post.viewer.canClaim === true;
  if (!canClaim && !post.viewer.canModerate) return <></>;
  const since = current === null ? '' : campTimeText(new Date(current.since), locale);

  return (
    <div className="flex flex-col gap-2">
      {current !== null && isMine && (
        <div className="border-tint-line bg-tint flex items-center gap-2 rounded-xl border py-1 pr-1 pl-3 text-[14px] text-green-900">
          <Hand className="text-conveniat-green h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            {forumText.claimMine[locale].replace('{time}', since)}
          </span>
          <button
            type="button"
            disabled={giveBack.isPending}
            onClick={() => giveBack.mutate({ assignmentId: current.id })}
            className="focus-visible:focus-surface hover:bg-tint-line h-11 shrink-0 cursor-pointer rounded-lg px-3 font-semibold text-green-900"
          >
            {forumText.giveBack[locale]}
          </button>
        </div>
      )}
      {current !== null && !isMine && (
        <p className="bg-quiet flex items-center gap-2 rounded-xl px-3 py-2.5 text-[14px] text-green-900">
          <Hand className="h-5 w-5 shrink-0 text-green-700" aria-hidden="true" />
          {forumText.claimOther[locale].replace('{name}', current.by.name).replace('{time}', since)}
        </p>
      )}
      <div className="flex gap-2">
        {canClaim && !isMine && (
          <button
            type="button"
            disabled={claim.isPending}
            onClick={() => claim.mutate({ postId: post.id })}
            // one primary action: a receiver's is reporting it done, further down
            className={post.myForward == undefined ? primaryClassName : outlinedClassName}
          >
            <Hand className="h-5 w-5" aria-hidden="true" />
            {forumText.claim[locale]}
          </button>
        )}
        {post.viewer.canModerate && post.mergedInto === null && post.status !== 'DONE' && (
          <button type="button" onClick={onForward} className={outlinedClassName}>
            <Forward className="h-5 w-5" aria-hidden="true" />
            {forumText.forward[locale]}
          </button>
        )}
      </div>
      {error !== undefined && (
        <p
          role="alert"
          className="bg-danger-soft text-danger-text rounded-xl px-3 py-2 text-[13px] font-medium"
        >
          {error}
        </p>
      )}
    </div>
  );
};

const PostHeader: React.FC<{
  post: ForumPostDetail;
  locale: Locale;
  onReportDone: () => void;
  onForward: () => void;
  onFlag: () => void;
  onRevise: () => void;
  onHide: () => void;
  currentUserId: string | undefined;
}> = ({ post, locale, onReportDone, onForward, onFlag, onRevise, onHide, currentUserId }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [now] = useState(() => new Date());
  const statusFailure = useForumStatusFailure(post.id);

  const like = useToggleForumLike();
  const subscribe = useMutation(
    trpc.forum.updateForumPostSubscription.mutationOptions({
      onSettled: () =>
        void queryClient.invalidateQueries(
          trpc.forum.getForumPost.queryFilter({ postId: post.id }),
        ),
    }),
  );
  const withdraw = useMutation(
    trpc.forum.endForumPostAssignment.mutationOptions({
      onSettled: () =>
        void queryClient.invalidateQueries(
          trpc.forum.getForumPost.queryFilter({ postId: post.id }),
        ),
    }),
  );

  // absent in a persisted cache from before the Zentrale
  const myForward = post.myForward ?? null;
  const SubscribeIcon = post.subscribed ? Bell : BellOff;
  const subscribeLabel = post.subscribed
    ? forumText.unsubscribePost[locale]
    : forumText.subscribePost[locale];

  return (
    <article className="border-line flex flex-col gap-3 border-b bg-white px-4 pt-4 pb-4">
      <div className="flex items-center gap-2.5">
        {post.author !== null && (
          <PersonAvatar
            seed={post.author.id}
            name={post.author.name}
            className="h-9 w-9 text-[13px]"
          />
        )}
        <p className="min-w-0 text-[13px] leading-tight text-green-700">
          <span className="text-heading block truncate font-semibold">
            {post.author?.name ?? ''}
          </span>
          {/* the topic is the screen's title already */}
          {relativeTimeText(new Date(post.createdAt), locale, now)}
          {post.editedAt != null && ` · ${forumText.edited[locale]}`}
        </p>
        {post.byTopicAdmin && (
          <KernteamBadge locale={locale} label={post.kernteamLabel} className="ml-auto" />
        )}
      </div>

      <h2 className="font-heading text-heading text-[22px] leading-tight font-extrabold">
        {post.title}
      </h2>

      <div className="flex flex-wrap items-center gap-1.5">
        {post.conversation == null && post.kind !== undefined && (
          <span className="bg-chip inline-flex h-[22px] items-center rounded-md px-1.5 text-[12px] font-semibold text-green-900">
            {forumKindLabel[post.kind][locale]}
          </span>
        )}
        {/* a problem and a conversation show where they stand, a question whether it is answered */}
        {((post.kind ?? 'PROBLEM') === 'PROBLEM' || post.conversation != null) && (
          <ForumStatusPill status={post.status} locale={locale} />
        )}
        {post.kind === 'QUESTION' && (
          <span
            className={cn(
              'inline-flex h-[22px] items-center gap-1 rounded-full border px-2 text-[12px] font-semibold',
              post.answerCommentId === null
                ? 'border-line bg-white text-green-700'
                : 'bg-conveniat-green border-conveniat-green text-white',
            )}
          >
            {post.answerCommentId !== null && (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {post.answerCommentId === null
              ? forumText.unanswered[locale]
              : forumText.answered[locale]}
          </span>
        )}
        {post.location !== null && (
          <Link
            href={mapHrefOf(post)}
            className="bg-tint focus-visible:focus-surface inline-flex h-[22px] items-center gap-1 rounded-md px-1.5 text-[12px] font-semibold text-green-800"
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {forumText.onMap[locale]}
          </Link>
        )}
      </div>

      {post.conversation != null && (
        <p className="bg-quiet flex items-start gap-2 rounded-xl p-3 text-[14px] text-green-900">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-green-700" aria-hidden="true" />
          <span className="text-balance">
            {post.conversation.closed
              ? forumText.conversationClosed[locale]
              : forumText.conversationBanner[locale].replace(
                  '{topic}',
                  post.conversation.topicName,
                )}
          </span>
        </p>
      )}
      {post.pending === true && <PendingBanner post={post} locale={locale} />}
      <RemovalBanner post={post} locale={locale} onRevise={onRevise} onHide={onHide} />
      {post.viewer.myFlag != null && (
        <p className="bg-quiet flex items-start gap-2 rounded-xl px-3 py-2.5 text-[13px] text-green-900">
          <Flag className="mt-0.5 h-4 w-4 shrink-0 text-green-700" aria-hidden="true" />
          {forumText.youFlagged[locale].replace(
            '{reason}',
            forumFlagReasonLabel[post.viewer.myFlag][locale],
          )}
        </p>
      )}

      {post.mergedInto !== null && (
        <Link
          href={`/app/forum/${post.mergedInto.id}`}
          className="bg-quiet focus-visible:focus-surface rounded-xl px-3 py-2.5 text-[14px] text-green-800"
        >
          {forumText.mergedInto[locale]}{' '}
          <span className="text-heading font-semibold">«{post.mergedInto.title}»</span>
        </Link>
      )}

      {post.text !== '' && (
        <p className="text-[15px] leading-[1.5] whitespace-pre-wrap text-green-900">{post.text}</p>
      )}

      {post.images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {post.images.map((image) => (
            <div key={image} className="overflow-hidden rounded-xl">
              <ChatImage url={image} />
            </div>
          ))}
        </div>
      )}

      {/* a closed conversation has nothing left to like, follow or flag */}
      {post.conversation?.closed !== true && (
        <div className="flex gap-2">
          {/* nobody else reads a private conversation, so nobody else is affected by it too */}
          {post.conversation == null && post.removal?.kind !== 'DELETED' && (
            <button
              type="button"
              aria-pressed={post.likedByMe}
              disabled={post.mergedInto !== null}
              onClick={() => like.mutate({ messageId: post.id, emoji: FORUM_LIKE_EMOJI })}
              className={cn(
                'focus-visible:focus-surface flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border text-[14px] font-bold transition-colors disabled:opacity-50',
                // liked is a state, not the view's primary action: the soft tint, so "Ich
                // übernehme" stays the one filled button for whoever handles the post
                post.likedByMe
                  ? 'bg-tint border-tint-line text-green-800'
                  : 'border-line hover:bg-quiet bg-white text-green-800',
              )}
            >
              <ThumbsUp
                className={cn('h-5 w-5', post.likedByMe && 'fill-current')}
                aria-hidden="true"
              />
              {forumLikeLabel[post.kind ?? 'PROBLEM'][locale]} · {post.likeCount}
            </button>
          )}
          <button
            type="button"
            aria-pressed={post.subscribed}
            aria-label={subscribeLabel}
            title={subscribeLabel}
            onClick={() => subscribe.mutate({ postId: post.id, subscribed: !post.subscribed })}
            className={cn(
              'focus-visible:focus-surface border-line hover:bg-quiet flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border bg-white',
              post.subscribed ? 'text-conveniat-green' : 'text-green-700',
            )}
          >
            <SubscribeIcon
              className={cn('h-5 w-5', post.subscribed && 'fill-current')}
              aria-hidden="true"
            />
          </button>
        </div>
      )}
      {/* flagging is a secondary action, so it does not stand next to "Ich auch" */}
      {post.viewer.canFlag === true && post.viewer.myFlag == null && (
        <button
          type="button"
          onClick={onFlag}
          className="focus-visible:focus-surface hover:bg-quiet -mt-1 -ml-2 flex h-11 cursor-pointer items-center gap-1.5 self-start rounded-xl px-2 text-[13px] font-semibold text-green-700"
        >
          <Flag className="h-4 w-4" aria-hidden="true" />
          {forumText.flagTitle[locale]}
        </button>
      )}

      <ZentraleActions
        post={post}
        locale={locale}
        currentUserId={currentUserId}
        onForward={onForward}
      />

      {statusFailure !== undefined && (
        <p
          role="alert"
          className="bg-danger-soft text-danger-text rounded-xl px-3 py-2 text-[13px] font-medium"
        >
          {failureText(statusFailure, locale)}
        </p>
      )}

      {myForward !== null && (
        <div className="border-tint-line bg-tint flex flex-col gap-2 rounded-xl border p-3">
          <p className="flex items-start gap-2 text-[14px] text-green-900">
            <Forward className="text-conveniat-green mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="text-balance">
              <span className="font-semibold">
                {myForward.ressort === null
                  ? forumText.forwardedToMe[locale].replace('{by}', myForward.byName)
                  : forumText.forwardedToRessort[locale]
                      .replace('{ressort}', myForward.ressort)
                      .replace('{by}', myForward.byName)}
              </span>
              {myForward.note !== null && (
                <span className="mt-0.5 block text-green-800">«{myForward.note}»</span>
              )}
            </span>
          </p>
          <div className="flex gap-2">
            {post.status !== 'DONE' && (
              <button type="button" onClick={onReportDone} className={primaryClassName}>
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                {forumText.reportDone[locale]}
              </button>
            )}
            <button
              type="button"
              disabled={withdraw.isPending}
              onClick={() => withdraw.mutate({ assignmentId: myForward.id })}
              className={outlinedClassName}
            >
              {forumText.giveBack[locale]}
            </button>
          </div>
        </div>
      )}

      {post.assignments.length > 0 && myForward === null && (
        <ul className="flex flex-col gap-1.5">
          {post.assignments.map((assignment) => (
            <li
              key={assignment.id}
              className="bg-quiet flex min-h-11 items-center gap-2 rounded-xl px-3 py-1.5 text-[13px] text-green-800"
            >
              <ClipboardCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                {forumText.assignedTo[locale]}:{' '}
                <span className="font-semibold text-green-900">{assignment.assignee.name}</span>
                {assignment.holders !== undefined && ` · ${assignment.holders.join(', ')}`} (
                {forumText.from[locale]} {assignment.assignedByName})
              </span>
              {post.viewer.canModerate && (
                <button
                  type="button"
                  disabled={withdraw.isPending}
                  onClick={() => withdraw.mutate({ assignmentId: assignment.id })}
                  className="focus-visible:focus-surface hover:bg-chip h-11 shrink-0 cursor-pointer rounded-lg px-2 font-semibold text-green-900"
                >
                  {forumText.withdraw[locale]}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {post.answerCommentId !== null && (
        <MarkedAnswer commentId={post.answerCommentId} locale={locale} />
      )}

      {post.statusHistory.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <SectionLabel as="h3">{forumText.history[locale]}</SectionLabel>
          <ol className="border-line divide-line divide-y rounded-xl border">
            {post.statusHistory.map((change) => (
              <li
                key={change.at.toString()}
                className="flex gap-3 px-3 py-2 text-[13px] text-green-800"
              >
                <span className="w-11 shrink-0 text-green-600">
                  {campTimeText(new Date(change.at), locale)}
                </span>
                <span className="min-w-0">
                  <span className="font-semibold text-green-900">
                    {forumStatusLabel[change.status][locale]}
                  </span>{' '}
                  · {change.actorName} ({forumCapacityLabel[change.capacity][locale]}
                  {change.delegatedByName === null
                    ? ''
                    : `, ${forumText.from[locale]} ${change.delegatedByName}`}
                  ){change.note !== null && <span className="block">«{change.note}»</span>}
                </span>
              </li>
            ))}
            <li className="flex gap-3 px-3 py-2 text-[13px] text-green-800">
              <span className="w-11 shrink-0 text-green-600">
                {campTimeText(new Date(post.createdAt), locale)}
              </span>
              <span>
                <span className="font-semibold text-green-900">{forumText.reported[locale]}</span> ·{' '}
                {post.author?.name ?? ''}
              </span>
            </li>
          </ol>
        </section>
      )}
    </article>
  );
};

/** What the post's page opens from a comment's actions: a flag, or a moderator's removal. */
interface CommentSheets {
  flagTarget: { messageId: string; isComment: boolean } | undefined;
  setFlagTarget: (target: { messageId: string; isComment: boolean } | undefined) => void;
  removeTarget: RemoveTarget | undefined;
  setRemoveTarget: (target: RemoveTarget | undefined) => void;
}

const ForumPostScreen: React.FC<{
  post: ForumPostDetail;
  locale: Locale;
  sheets: CommentSheets;
}> = ({ post, locale, sheets }) => {
  const trpc = useTRPC();
  const [sheet, setSheet] = useState<'moderate' | 'forward' | 'done' | 'edit' | undefined>();
  const { data: currentUserId } = useQuery(trpc.chat.user.queryOptions({}));
  useChatSSE([post.topicId]);

  const canOpenSheet = post.viewer.canModerate || post.viewer.canSetStatus || post.viewer.isAuthor;
  // a closed conversation and a removed post take no more comments
  const takesComments =
    post.mergedInto === null &&
    post.conversation?.closed !== true &&
    post.removal?.kind !== 'DELETED';

  return (
    <div className={screenClassName}>
      <AppFooterController hideAppFooter />
      <ScreenHeader
        title={post.conversation?.topicName ?? post.topicName}
        locale={locale}
        actions={
          canOpenSheet && (
            <button
              type="button"
              onClick={() => setSheet('moderate')}
              aria-label={forumText.moderate[locale]}
              className="focus-visible:focus-surface hover:bg-quiet flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-green-900"
            >
              <MoreVertical className="h-5 w-5" aria-hidden="true" />
            </button>
          )
        }
      />
      <OfflineBanner locale={locale} />
      <div className="flex-1 overflow-hidden">
        <MessageList
          parentId={post.id}
          isThread
          hideReplyCount
          threadHeader={
            <PostHeader
              post={post}
              locale={locale}
              currentUserId={currentUserId}
              onReportDone={() => setSheet('done')}
              onForward={() => setSheet('forward')}
              onFlag={() => sheets.setFlagTarget({ messageId: post.id, isComment: false })}
              onRevise={() => setSheet('edit')}
              onHide={() => sheets.setRemoveTarget({ messageId: post.id, kind: 'HIDDEN' })}
            />
          }
        />
      </div>
      {takesComments && (
        <ChatComposerBar>
          <ChatTextAreaInput />
        </ChatComposerBar>
      )}
      <ForumModerationSheet
        // a fresh sheet for each way in, so "Weiterleiten" opens on the forward
        key={sheet === 'forward' ? 'forward' : 'moderate'}
        post={post}
        locale={locale}
        startOnForward={sheet === 'forward'}
        open={sheet === 'moderate' || sheet === 'forward'}
        onOpenChange={(open) => setSheet(open ? (sheet ?? 'moderate') : undefined)}
        onEdit={() => setSheet('edit')}
      />
      {sheets.removeTarget !== undefined && (
        <ForumModerationSheet
          key={`remove-${sheets.removeTarget.messageId}-${sheets.removeTarget.kind}`}
          post={post}
          locale={locale}
          startOnRemove={sheets.removeTarget}
          open
          onOpenChange={(open) => {
            if (!open) sheets.setRemoveTarget(undefined);
          }}
        />
      )}
      <ForumFlagSheet
        messageId={sheets.flagTarget?.messageId}
        postId={post.id}
        isComment={sheets.flagTarget?.isComment === true}
        topicName={post.topicName}
        onClose={() => sheets.setFlagTarget(undefined)}
        locale={locale}
      />
      {sheet === 'edit' && (
        <ForumEditPostSheet
          post={post}
          open
          onOpenChange={(open) => setSheet(open ? 'edit' : undefined)}
          locale={locale}
        />
      )}
      <ForumDoneSheet
        post={post}
        locale={locale}
        open={sheet === 'done'}
        onOpenChange={(open) => setSheet(open ? 'done' : undefined)}
      />
    </div>
  );
};

/**
 * A post and its comments. The comments are the thread of the post's message, shown with the
 * chat's own message list and composer, so sending offline, quoting, reactions and deleting
 * one's own comment work as in any thread.
 */
export const ForumPostView: React.FC<{
  /** the post, for the Zentrale's pane on a desktop; else the one the URL names */
  postId?: string | undefined;
}> = ({ postId: chosenPostId }) => {
  const pathPostId = usePostIdFromPath();
  const fromZentrale = useSearchParams().get('from') === 'zentrale';
  return (
    <BackHrefContext.Provider
      value={chosenPostId !== undefined || fromZentrale ? ZENTRALE_PATH : '/app/forum'}
    >
      <ForumPostContent postId={chosenPostId ?? pathPostId} />
    </BackHrefContext.Provider>
  );
};

const ForumPostContent: React.FC<{ postId: string | undefined }> = ({ postId }) => {
  const trpc = useTRPC();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const query = useQuery(
    trpc.forum.getForumPost.queryOptions(
      { postId: postId ?? '' },
      { enabled: postId !== undefined },
    ),
  );

  if (postId === undefined || query.isError) {
    return (
      <div className={screenClassName}>
        <AppFooterController hideAppFooter />
        <ScreenHeader title={forumText.title[locale]} locale={locale} />
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            icon={MessageSquareOff}
            title={
              query.error === null
                ? forumText.loadFailed[locale]
                : userErrorMessage(query.error, locale, forumErrorTexts, forumText.loadFailed)
            }
          />
        </div>
      </div>
    );
  }

  if (query.data === undefined) {
    return (
      <div className={screenClassName}>
        <AppFooterController hideAppFooter />
        <ScreenHeader title={forumText.title[locale]} locale={locale} />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-green-700" aria-hidden="true" />
        </div>
      </div>
    );
  }

  return <ForumPostLoaded post={query.data} locale={locale} />;
};

/**
 * A loaded post with its thread. What a comment's long press offers besides the chat's own
 * actions comes from here: "Melden" for others' comments, and for the moderators hide, show
 * again and delete, each with a reason.
 */
const ForumPostLoaded: React.FC<{ post: ForumPostDetail; locale: Locale }> = ({ post, locale }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [flagTarget, setFlagTarget] = useState<CommentSheets['flagTarget']>();
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | undefined>();
  const { data: currentUserId } = useQuery(trpc.chat.user.queryOptions({}));
  const restore = useMutation(
    trpc.forum.restoreForumMessage.mutationOptions({
      onSettled: () => void queryClient.invalidateQueries(trpc.chat.infiniteMessages.pathFilter()),
    }),
  );

  const messageActions = (message: ChatMessage): ExtraMessageAction[] => {
    // a removed message, or one hidden from this reader; whoever may restore it reads it in full
    if (message.deletedAt !== undefined) return [];
    if (message.senderId === currentUserId) return [];
    if (post.viewer.canModerate) {
      const hidden = message.forumRemoval?.kind === 'HIDDEN';
      return [
        hidden
          ? {
              key: 'restore',
              label: forumText.restore[locale],
              icon: Eye,
              onSelect: () => restore.mutate({ messageId: message.id }),
            }
          : {
              key: 'hide',
              label: forumText.hide[locale],
              icon: EyeOff,
              destructive: true,
              onSelect: () => setRemoveTarget({ messageId: message.id, kind: 'HIDDEN' }),
            },
        {
          key: 'delete',
          label: forumText.removeDelete[locale],
          icon: Trash2,
          destructive: true,
          onSelect: () => setRemoveTarget({ messageId: message.id, kind: 'DELETED' }),
        },
      ];
    }
    // a private conversation has only its writer and its moderators to read it
    if (post.conversation != null) return [];
    return [
      {
        key: 'flag',
        label: forumText.flag[locale],
        icon: Flag,
        onSelect: () => setFlagTarget({ messageId: message.id, isComment: true }),
      },
    ];
  };

  return (
    <ChatIdProvider chatId={post.topicId}>
      {/* keyed: another post gets a fresh thread, draft and scroll */}
      <ChatActionsProvider key={post.id} threadId={post.id} messageActions={messageActions}>
        <ForumPostScreen
          post={post}
          locale={locale}
          sheets={{ flagTarget, setFlagTarget, removeTarget, setRemoveTarget }}
        />
      </ChatActionsProvider>
    </ChatIdProvider>
  );
};
