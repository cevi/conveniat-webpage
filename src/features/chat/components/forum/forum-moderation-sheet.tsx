'use client';

import { AppSearchBar } from '@/components/ui/app-search-bar';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { textInputClassName } from '@/components/ui/field';
import { IconTile } from '@/components/ui/icon-tile';
import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import type { ForumPostDetail } from '@/features/chat/api/forum/forum-queries';
import { forumText } from '@/features/chat/components/forum/forum-texts';
import { useForumStatusChange } from '@/features/chat/components/forum/use-forum-status-outbox';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import { forumErrorTexts } from '@/lib/forum-error-texts';
import {
  FORUM_NOTE_MAX_LENGTH,
  FORUM_POST_STATUSES,
  forumStatusLabel,
  type ForumPostStatusValue,
} from '@/lib/forum-shared';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { userErrorMessage } from '@/utils/user-error-message';
import {
  CheckCircle2,
  ChevronRight,
  Combine,
  Loader2,
  Pin,
  PinOff,
  Trash2,
  Undo2,
  UserPlus,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

type View = 'main' | 'assign' | 'merge' | 'answer' | 'delete';

const rowClassName =
  'focus-visible:focus-surface hover:bg-quiet flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const textOf = (payload: unknown): string => {
  const text = (payload as { text?: unknown } | undefined)?.text;
  return typeof text === 'string' ? text : '';
};

/**
 * What the Kernteam and the piket on duty can do with a post, and a helper with theirs: set the
 * status with a note, pin, mark the answer, merge a duplicate, hand it to someone, delete it.
 * Every one of them lands in the forum protocol. The author alone may delete their own post.
 */
export const ForumModerationSheet: React.FC<{
  post: ForumPostDetail;
  locale: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ post, locale, open, onOpenChange }) => {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [view, setView] = useState<View>('main');
  const [status, setStatus] = useState<ForumPostStatusValue>(post.status);
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const changeStatus = useForumStatusChange();

  const refresh = (): void => {
    void utils.forum.invalidate();
  };
  const fail = (caught: unknown): void =>
    setError(userErrorMessage(caught, locale, forumErrorTexts, forumText.changeFailed));
  const close = (): void => {
    setView('main');
    setQuery('');
    setNote('');
    setError(undefined);
    setNotice(undefined);
    setAssigneeId(undefined);
    onOpenChange(false);
  };

  const pin = trpc.forum.setForumPostPinned.useMutation({ onSuccess: refresh, onError: fail });
  const answer = trpc.forum.setForumPostAnswer.useMutation({
    onSuccess: () => {
      refresh();
      close();
    },
    onError: fail,
  });
  const merge = trpc.forum.mergeForumPost.useMutation({
    onSuccess: () => {
      refresh();
      close();
    },
    onError: fail,
  });
  const unmerge = trpc.forum.unmergeForumPost.useMutation({ onSuccess: refresh, onError: fail });
  const assign = trpc.forum.createForumPostAssignment.useMutation({
    onSuccess: () => {
      refresh();
      close();
    },
    onError: fail,
  });
  const moderatorDelete = trpc.forum.deleteForumMessage.useMutation({
    onSuccess: () => {
      refresh();
      router.push('/app/forum');
    },
    onError: fail,
  });
  const ownDelete = trpc.chat.deleteMessage.useMutation({
    onSuccess: () => {
      refresh();
      router.push('/app/forum');
    },
    onError: fail,
  });

  const assignees = trpc.forum.getForumAssigneeList.useQuery(
    { topicId: post.topicId, query: query.trim() },
    { enabled: view === 'assign' && query.trim().length >= 2 },
  );
  const mergeTargets = trpc.forum.getForumPostSuggestionList.useQuery(
    { topicId: post.topicId, title: query },
    { enabled: view === 'merge' && query.trim().length >= 3 },
  );
  const comments = trpc.chat.infiniteMessages.useInfiniteQuery(
    { chatId: post.topicId, limit: CHAT_PAGE_SIZE, parentId: post.id },
    { enabled: view === 'answer', getNextPageParam: (last) => last.nextCursor ?? undefined },
  );

  const saveStatus = async (): Promise<void> => {
    setError(undefined);
    try {
      const outcome = await changeStatus({
        postId: post.id,
        status,
        note: note.trim() === '' ? undefined : note.trim(),
      });
      if (outcome === 'queued') {
        setNotice(forumText.queuedOffline[locale]);
        return;
      }
      close();
    } catch (error_) {
      fail(error_);
    }
  };

  const titleOf: Record<View, string> = {
    main: forumText.moderate[locale],
    assign: forumText.assign[locale],
    merge: forumText.merge[locale],
    answer: forumText.markAnswer[locale],
    delete: forumText.deletePost[locale],
  };

  let content: React.ReactNode;
  switch (view) {
    case 'assign': {
      content = (
        <div className="flex flex-col gap-3 pb-2">
          <AppSearchBar
            placeholder={forumText.assignSearch[locale]}
            label={forumText.assignSearch[locale]}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onClear={() => setQuery('')}
            autoFocus
          />
          <ul className="border-line divide-line divide-y overflow-hidden rounded-[14px] border bg-white">
            {assignees.data?.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  aria-pressed={assigneeId === person.id}
                  onClick={() => setAssigneeId(person.id)}
                  className={cn(rowClassName, assigneeId === person.id && 'bg-tint')}
                >
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-green-900">
                    {person.name}
                  </span>
                  {assigneeId === person.id && (
                    <CheckCircle2 className="text-conveniat-green h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </li>
            ))}
          </ul>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-green-800">
              {forumText.assignNote[locale]}
            </span>
            <textarea
              value={note}
              rows={2}
              maxLength={FORUM_NOTE_MAX_LENGTH}
              onChange={(event) => setNote(event.target.value)}
              className={textInputClassName}
            />
          </label>
        </div>
      );
      break;
    }
    case 'merge': {
      content = (
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-[13px] text-green-700">{forumText.mergeHint[locale]}</p>
          <AppSearchBar
            placeholder={forumText.searchPost[locale]}
            label={forumText.searchPost[locale]}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onClear={() => setQuery('')}
            autoFocus
          />
          <ul className="border-line divide-line divide-y overflow-hidden rounded-[14px] border bg-white">
            {mergeTargets.data
              ?.filter((candidate) => candidate.id !== post.id)
              .map((candidate) => (
                <li key={candidate.id}>
                  <button
                    type="button"
                    disabled={merge.isPending}
                    onClick={() => merge.mutate({ postId: post.id, intoPostId: candidate.id })}
                    className={rowClassName}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="text-heading block truncate text-[15px] font-semibold">
                        {candidate.title}
                      </span>
                      <span className="text-[12px] text-green-700">
                        {forumStatusLabel[candidate.status][locale]} · {candidate.likeCount} 👍
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-green-500" aria-hidden="true" />
                  </button>
                </li>
              ))}
          </ul>
        </div>
      );
      break;
    }
    case 'answer': {
      const items = comments.data?.pages.flatMap((page) => page.items) ?? [];
      content = (
        <ul className="border-line divide-line mb-2 divide-y overflow-hidden rounded-[14px] border bg-white">
          {comments.isLoading && (
            <li className="flex justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-green-700" aria-hidden="true" />
            </li>
          )}
          {items
            .filter((item) => item.deletedAt === undefined && textOf(item.messagePayload) !== '')
            .map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={answer.isPending}
                  onClick={() => answer.mutate({ postId: post.id, commentId: item.id })}
                  className={cn(rowClassName, post.answerCommentId === item.id && 'bg-tint')}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-semibold text-green-700">
                      {item.senderName ?? ''}
                    </span>
                    <span className="line-clamp-2 text-[14px] text-green-900">
                      {textOf(item.messagePayload)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
        </ul>
      );
      break;
    }
    case 'delete': {
      content = (
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-[14px] text-green-800">{forumText.deleteConfirm[locale]}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setView('main')}
              className="bg-quiet hover:bg-chip focus-visible:focus-surface h-11 flex-1 cursor-pointer rounded-xl text-[15px] font-semibold text-green-900"
            >
              {forumText.cancel[locale]}
            </button>
            <button
              type="button"
              disabled={moderatorDelete.isPending || ownDelete.isPending}
              onClick={() =>
                post.viewer.canModerate
                  ? moderatorDelete.mutate({ messageId: post.id })
                  : ownDelete.mutate({ messageId: post.id })
              }
              className="border-danger-line text-danger-text hover:bg-danger-soft focus-visible:focus-surface-danger h-11 flex-1 cursor-pointer rounded-xl border bg-white text-[15px] font-semibold"
            >
              {forumText.deleteYes[locale]}
            </button>
          </div>
        </div>
      );
      break;
    }
    case 'main': {
      content = (
        <div className="flex flex-col gap-4 pb-2">
          {post.viewer.canSetStatus && (
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-bold tracking-[0.08em] text-green-700 uppercase">
                {forumText.status[locale]}
              </h3>
              <div className={segmentedTrackClassName}>
                {FORUM_POST_STATUSES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={status === value}
                    onClick={() => setStatus(value)}
                    className={cn(
                      segmentClassName(status === value),
                      'flex-1 text-[14px] font-semibold',
                    )}
                  >
                    {forumStatusLabel[value][locale]}
                  </button>
                ))}
              </div>
              <textarea
                value={note}
                rows={2}
                maxLength={FORUM_NOTE_MAX_LENGTH}
                placeholder={forumText.statusNote[locale]}
                aria-label={forumText.statusNote[locale]}
                onChange={(event) => setNote(event.target.value)}
                className={textInputClassName}
              />
              <button
                type="button"
                disabled={status === post.status && note.trim() === ''}
                onClick={() => void saveStatus()}
                className="bg-conveniat-green focus-visible:focus-surface-filled flex h-11 cursor-pointer items-center justify-center rounded-xl text-[15px] font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {forumText.saveStatus[locale]}
              </button>
            </section>
          )}

          {post.viewer.canModerate && (
            <ul className="border-line divide-line divide-y overflow-hidden rounded-[14px] border bg-white">
              <li>
                <button
                  type="button"
                  disabled={pin.isPending || post.mergedInto !== null}
                  onClick={() => pin.mutate({ postId: post.id, pinned: !post.pinned })}
                  className={rowClassName}
                >
                  <IconTile icon={post.pinned ? PinOff : Pin} />
                  <span className="flex-1 text-[15px] font-semibold text-green-900">
                    {post.pinned ? forumText.unpin[locale] : forumText.pin[locale]}
                  </span>
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setView('answer')} className={rowClassName}>
                  <IconTile icon={CheckCircle2} />
                  <span className="flex-1 text-[15px] font-semibold text-green-900">
                    {forumText.markAnswer[locale]}
                  </span>
                  <ChevronRight className="h-5 w-5 text-green-500" aria-hidden="true" />
                </button>
              </li>
              {post.answerCommentId !== null && (
                <li>
                  <button
                    type="button"
                    onClick={() => answer.mutate({ postId: post.id, commentId: null })}
                    className={rowClassName}
                  >
                    <IconTile icon={Undo2} />
                    <span className="flex-1 text-[15px] font-semibold text-green-900">
                      {forumText.unmarkAnswer[locale]}
                    </span>
                  </button>
                </li>
              )}
              <li>
                <button
                  type="button"
                  disabled={post.status === 'DONE' || post.mergedInto !== null}
                  onClick={() => setView('assign')}
                  className={rowClassName}
                >
                  <IconTile icon={UserPlus} />
                  <span className="flex-1 text-[15px] font-semibold text-green-900">
                    {forumText.assign[locale]}
                  </span>
                  <ChevronRight className="h-5 w-5 text-green-500" aria-hidden="true" />
                </button>
              </li>
              <li>
                {post.mergedInto === null ? (
                  <button type="button" onClick={() => setView('merge')} className={rowClassName}>
                    <IconTile icon={Combine} />
                    <span className="flex-1 text-[15px] font-semibold text-green-900">
                      {forumText.merge[locale]}
                    </span>
                    <ChevronRight className="h-5 w-5 text-green-500" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={unmerge.isPending}
                    onClick={() => unmerge.mutate({ postId: post.id })}
                    className={rowClassName}
                  >
                    <IconTile icon={Undo2} />
                    <span className="flex-1 text-[15px] font-semibold text-green-900">
                      {forumText.unmerge[locale]}
                    </span>
                  </button>
                )}
              </li>
            </ul>
          )}

          {(post.viewer.canModerate || post.viewer.isAuthor) && (
            <button
              type="button"
              onClick={() => setView('delete')}
              className="border-danger-line text-danger-text hover:bg-danger-soft focus-visible:focus-surface-danger flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border bg-white text-[15px] font-semibold"
            >
              <Trash2 className="h-5 w-5" aria-hidden="true" />
              {forumText.deletePost[locale]}
            </button>
          )}
        </div>
      );
      break;
    }
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title={titleOf[view]}
      description={post.title}
      fullHeight={view === 'assign' || view === 'merge'}
      footer={
        view === 'assign' ? (
          <button
            type="button"
            disabled={assigneeId === undefined || assign.isPending}
            onClick={() =>
              assigneeId !== undefined &&
              assign.mutate({
                postId: post.id,
                assigneeId,
                ...(note.trim() === '' ? {} : { note: note.trim() }),
              })
            }
            className="bg-conveniat-green focus-visible:focus-surface-filled flex h-11 w-full cursor-pointer items-center justify-center rounded-xl text-[15px] font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {forumText.assignAction[locale]}
          </button>
        ) : undefined
      }
    >
      {content}
      {notice !== undefined && (
        <p role="status" className="bg-quiet mb-2 rounded-xl px-3 py-2 text-[13px] text-green-800">
          {notice}
        </p>
      )}
      {error !== undefined && (
        <p
          role="alert"
          className="bg-danger-soft text-danger-text mb-2 rounded-xl px-3 py-2 text-[13px] font-medium"
        >
          {error}
        </p>
      )}
    </BottomSheet>
  );
};
