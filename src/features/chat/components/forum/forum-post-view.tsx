'use client';

import { AppFooterController } from '@/components/footer/hide-footer-context';
import { OfflineBanner } from '@/components/offline-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { SectionLabel } from '@/components/ui/section-label';
import type { ForumPostDetail } from '@/features/chat/api/forum/forum-queries';
import { ChatComposerBar } from '@/features/chat/components/chat-view/chat-client-component';
import { ChatTextAreaInput } from '@/features/chat/components/chat-view/chat-text-area-input';
import { MessageList } from '@/features/chat/components/chat-view/message-list';
import { ChatImage } from '@/features/chat/components/chat-view/message/chat-image';
import { ForumDoneSheet } from '@/features/chat/components/forum/forum-done-sheet';
import { ForumModerationSheet } from '@/features/chat/components/forum/forum-moderation-sheet';
import { ForumStatusPill } from '@/features/chat/components/forum/forum-status-pill';
import {
  campTimeText,
  forumText,
  relativeTimeText,
} from '@/features/chat/components/forum/forum-texts';
import { useForumStatusFailure } from '@/features/chat/components/forum/use-forum-status-outbox';
import { ChatActionsProvider } from '@/features/chat/context/chat-actions-context';
import { ChatIdProvider } from '@/features/chat/context/chat-id-context';
import { useChatSSE } from '@/features/chat/hooks/use-chat-sse';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { forumErrorTexts } from '@/lib/forum-error-texts';
import { FORUM_LIKE_EMOJI, forumCapacityLabel, forumStatusLabel } from '@/lib/forum-shared';
import { trpc } from '@/trpc/client';
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
  Loader2,
  Lock,
  MapPin,
  MessageSquareOff,
  MoreVertical,
  ThumbsUp,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useState } from 'react';

/** `…/app/forum/<postId>`; the composer's `new` is a page of its own. */
const POST_ID_FROM_PATHNAME = /\/app\/forum\/([\da-f-]{36})\/?$/i;

/**
 * The post the URL names. Read in the browser, like a chat: the service worker replays one
 * shell for every post, so the page must not depend on its params.
 */
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
  return (
    <div className="border-line flex h-[60px] shrink-0 items-center gap-1 border-b bg-white pr-2 pl-1">
      <button
        type="button"
        onClick={() => router.push('/app/forum')}
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
  const router = useRouter();
  const utils = trpc.useUtils();
  const [confirmReject, setConfirmReject] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const fail = (caught: unknown): void =>
    setError(userErrorMessage(caught, locale, forumErrorTexts, forumText.changeFailed));
  const approve = trpc.forum.approveForumPost.useMutation({
    onSuccess: () => void utils.forum.invalidate(),
    onError: fail,
  });
  const reject = trpc.forum.deleteForumMessage.useMutation({
    onSuccess: () => {
      void utils.forum.invalidate();
      router.push('/app/forum');
    },
    onError: fail,
  });

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
                onClick={() => reject.mutate({ messageId: post.id })}
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
  const { data } = trpc.chat.getMessage.useQuery({ messageId: commentId });
  if (data === undefined) return <></>;
  const payload = data.messagePayload as { text?: unknown } | undefined;
  const text = typeof payload?.text === 'string' ? payload.text : '';
  return (
    <div className="border-tint-line bg-tint rounded-xl border p-3">
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-green-800">
        <CheckCircle2 className="text-conveniat-green h-4 w-4" aria-hidden="true" />
        {forumText.answer[locale]} · {data.senderName ?? ''}
      </p>
      <p className="mt-1 text-[14px] leading-[1.45] whitespace-pre-wrap text-green-900">{text}</p>
    </div>
  );
};

const PostHeader: React.FC<{
  post: ForumPostDetail;
  locale: Locale;
  onReportDone: () => void;
  currentUserId: string | undefined;
}> = ({ post, locale, onReportDone, currentUserId }) => {
  const utils = trpc.useUtils();
  const [now] = useState(() => new Date());
  const statusFailure = useForumStatusFailure(post.id);

  const like = trpc.chat.toggleReaction.useMutation({
    onMutate: () => {
      utils.forum.getForumPost.setData({ postId: post.id }, (old) =>
        old === undefined
          ? old
          : {
              ...old,
              likedByMe: !old.likedByMe,
              likeCount: old.likeCount + (old.likedByMe ? -1 : 1),
            },
      );
    },
    onSettled: () => {
      void utils.forum.getForumPost.invalidate({ postId: post.id });
      void utils.forum.getForumPostList.invalidate();
    },
  });
  const subscribe = trpc.forum.updateForumPostSubscription.useMutation({
    onSettled: () => void utils.forum.getForumPost.invalidate({ postId: post.id }),
  });
  const withdraw = trpc.forum.endForumPostAssignment.useMutation({
    onSettled: () => void utils.forum.getForumPost.invalidate({ postId: post.id }),
  });

  const myAssignment = post.assignments.find(
    (assignment) => assignment.assignee.id === currentUserId,
  );
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
          {post.topicName} · {relativeTimeText(new Date(post.createdAt), locale, now)}
        </p>
        {post.byTopicAdmin && (
          <span className="bg-conveniat-green ml-auto rounded-[5px] px-1.5 py-px text-[11px] font-bold text-white">
            {forumText.kernteam[locale]}
          </span>
        )}
      </div>

      <h2 className="font-heading text-heading text-[22px] leading-tight font-extrabold">
        {post.title}
      </h2>

      <div className="flex flex-wrap items-center gap-1.5">
        <ForumStatusPill status={post.status} locale={locale} />
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

      {post.private === true && (
        <p className="bg-quiet flex items-start gap-2 rounded-xl p-3 text-[14px] text-green-900">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-green-700" aria-hidden="true" />
          <span className="text-balance">{forumText.privateBanner[locale]}</span>
        </p>
      )}
      {post.pending === true && <PendingBanner post={post} locale={locale} />}

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

      <div className="flex gap-2">
        {/* nobody else sees a private report, so nobody else is affected by it too */}
        {post.private !== true && (
          <button
            type="button"
            aria-pressed={post.likedByMe}
            disabled={post.mergedInto !== null}
            onClick={() => like.mutate({ messageId: post.id, emoji: FORUM_LIKE_EMOJI })}
            className={cn(
              'focus-visible:focus-surface flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border text-[14px] font-bold transition-colors disabled:opacity-50',
              post.likedByMe
                ? 'bg-conveniat-green border-conveniat-green text-white'
                : 'border-line hover:bg-quiet bg-white text-green-800',
            )}
          >
            <ThumbsUp
              className={cn('h-5 w-5', post.likedByMe && 'fill-current')}
              aria-hidden="true"
            />
            {forumText.likeAction[locale]} · {post.likeCount}
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

      {statusFailure !== undefined && (
        <p
          role="alert"
          className="bg-danger-soft text-danger-text rounded-xl px-3 py-2 text-[13px] font-medium"
        >
          {failureText(statusFailure, locale)}
        </p>
      )}

      {myAssignment !== undefined && (
        <div className="border-tint-line bg-tint flex flex-col gap-2 rounded-xl border p-3">
          <p className="flex items-start gap-2 text-[14px] text-green-900">
            <ClipboardCheck
              className="text-conveniat-green mt-0.5 h-5 w-5 shrink-0"
              aria-hidden="true"
            />
            <span>
              <span className="font-semibold">{forumText.yourAssignment[locale]}</span>{' '}
              {forumText.from[locale]} {myAssignment.assignedByName}
              {myAssignment.note !== null && (
                <span className="mt-0.5 block text-green-800">«{myAssignment.note}»</span>
              )}
            </span>
          </p>
          {post.status !== 'DONE' && (
            <button
              type="button"
              onClick={onReportDone}
              className="bg-conveniat-green focus-visible:focus-surface-filled flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white hover:bg-green-700"
            >
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              {forumText.reportDone[locale]}
            </button>
          )}
        </div>
      )}

      {post.assignments.length > 0 && myAssignment === undefined && (
        <ul className="flex flex-col gap-1.5">
          {post.assignments.map((assignment) => (
            <li
              key={assignment.id}
              className="bg-quiet flex min-h-11 items-center gap-2 rounded-xl px-3 py-1.5 text-[13px] text-green-800"
            >
              <ClipboardCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                {forumText.assignedTo[locale]}:{' '}
                <span className="font-semibold text-green-900">{assignment.assignee.name}</span> (
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

const ForumPostScreen: React.FC<{ post: ForumPostDetail; locale: Locale }> = ({ post, locale }) => {
  const [sheet, setSheet] = useState<'moderate' | 'done' | undefined>();
  const { data: currentUserId } = trpc.chat.user.useQuery({});
  useChatSSE([post.topicId]);

  const canOpenSheet = post.viewer.canModerate || post.viewer.canSetStatus || post.viewer.isAuthor;

  return (
    <div className={screenClassName}>
      <AppFooterController hideAppFooter />
      <ScreenHeader
        title={post.topicName}
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
            />
          }
        />
      </div>
      {post.mergedInto === null && (
        <ChatComposerBar>
          <ChatTextAreaInput />
        </ChatComposerBar>
      )}
      <ForumModerationSheet
        post={post}
        locale={locale}
        open={sheet === 'moderate'}
        onOpenChange={(open) => setSheet(open ? 'moderate' : undefined)}
      />
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
export const ForumPostView: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const postId = usePostIdFromPath();
  const query = trpc.forum.getForumPost.useQuery(
    { postId: postId ?? '' },
    { enabled: postId !== undefined },
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

  const post = query.data;
  return (
    <ChatIdProvider chatId={post.topicId}>
      {/* keyed: another post gets a fresh thread, draft and scroll */}
      <ChatActionsProvider key={post.id} threadId={post.id}>
        <ForumPostScreen post={post} locale={locale} />
      </ChatActionsProvider>
    </ChatIdProvider>
  );
};
