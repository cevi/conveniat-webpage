'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/buttons/button';
import { textInputClassName } from '@/components/ui/field';
import type { ForumPostDetail } from '@/features/chat/api/forum/forum-queries';
import { forumText } from '@/features/chat/components/forum/forum-texts';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { forumErrorTexts } from '@/lib/forum-error-texts';
import {
  FORUM_TEXT_MAX_LENGTH,
  FORUM_TITLE_MAX_LENGTH,
  forumCapacityLabel,
  forumFlagReasonLabel,
} from '@/lib/forum-shared';
import { useTRPC } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { userErrorMessage } from '@/utils/user-error-message';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Flag, Loader2, Pencil, ShieldAlert } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

/**
 * A post a moderator or flags took away, at the top of its page. Its author reads why and can
 * revise a hidden one and ask for it back; a moderator shows it again or leaves it; everyone else
 * only learns that it was removed. A post with open flags shows them to its moderators.
 */
export const RemovalBanner: React.FC<{
  post: ForumPostDetail;
  locale: Locale;
  onRevise: () => void;
  /** a moderator hides the flagged post, with a reason */
  onHide?: () => void;
}> = ({ post, locale, onRevise, onHide }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const refresh = (): void => void queryClient.invalidateQueries(trpc.forum.pathFilter());
  const restore = useMutation(
    trpc.forum.restoreForumMessage.mutationOptions({ onSettled: refresh }),
  );
  const dismiss = useMutation(trpc.forum.dismissForumFlags.mutationOptions({ onSettled: refresh }));
  const review = useMutation(trpc.forum.requestForumReview.mutationOptions({ onSettled: refresh }));
  const error = restore.error ?? dismiss.error ?? review.error;

  const removal = post.removal ?? null;
  const moderates = post.viewer.canModerate;
  const flags = post.flagCount ?? 0;
  if (removal === null && !(moderates && flags > 0)) return <></>;

  const reasonLine =
    removal === null
      ? undefined
      : `${forumText.reason[locale]}: ${forumFlagReasonLabel[removal.reason][locale]}${
          removal.byCapacity === null ? '' : ` · ${forumCapacityLabel[removal.byCapacity][locale]}`
        }`;

  let heading: string;
  if (removal === null) heading = forumText.flagsPill[locale].replace('{n}', String(flags));
  else if (removal.kind === 'DELETED') heading = forumText.removedByModeration[locale];
  else if (post.viewer.isAuthor) heading = forumText.hiddenForAuthor[locale];
  else if (moderates) heading = forumText.hiddenForModerator[locale];
  else heading = forumText.hiddenForOthers[locale];

  let Icon = EyeOff;
  if (removal === null) Icon = Flag;
  else if (removal.kind === 'DELETED') Icon = ShieldAlert;
  // a flag or a removal is something that went wrong for the author or needs a decision; the
  // plain notice to everyone else is only good to know
  const tone =
    removal === null || post.viewer.isAuthor ? 'border-danger-line bg-danger-soft' : 'bg-quiet';

  return (
    <div className={cn('flex flex-col gap-2.5 rounded-xl border border-transparent p-3', tone)}>
      <p className="flex items-start gap-2 text-[14px] text-green-900">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-green-800" aria-hidden="true" />
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold">{heading}</span>
          {reasonLine !== undefined && (post.viewer.isAuthor || moderates) && (
            <span className="text-[13px] text-green-800">{reasonLine}</span>
          )}
          {removal?.note != null && removal.note !== '' && (
            <span className="text-[13px] text-green-800">«{removal.note}»</span>
          )}
          {removal?.reviewRequested === true && (
            <span className="text-[13px] text-green-800">{forumText.reviewRequested[locale]}</span>
          )}
        </span>
      </p>

      {removal?.kind === 'HIDDEN' && post.viewer.isAuthor && (
        // one under the other on a phone, so neither label is cut
        <div className="flex flex-col gap-2">
          {post.viewer.canEdit === true && (
            <Button variant="outlined" size="touch" className="w-full" onClick={onRevise}>
              <Pencil aria-hidden="true" />
              {forumText.revise[locale]}
            </Button>
          )}
          {!removal.reviewRequested && (
            <Button
              variant="outlined"
              size="touch"
              className="w-full"
              disabled={review.isPending || !isOnline}
              onClick={() => review.mutate({ messageId: post.id })}
            >
              {forumText.requestReview[locale]}
            </Button>
          )}
        </div>
      )}

      {moderates && (removal?.kind === 'HIDDEN' || (removal === null && flags > 0)) && (
        <div className="flex flex-col gap-2">
          {removal?.kind === 'HIDDEN' && (
            <Button
              variant="outlined"
              size="touch"
              className="w-full"
              disabled={restore.isPending || !isOnline}
              onClick={() => restore.mutate({ messageId: post.id })}
            >
              {restore.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Eye aria-hidden="true" />
              )}
              {forumText.restore[locale]}
            </Button>
          )}
          {flags > 0 && (
            <Button
              variant="outlined"
              size="touch"
              className="w-full"
              disabled={dismiss.isPending || !isOnline}
              onClick={() => dismiss.mutate({ messageId: post.id })}
            >
              {forumText.dismissFlags[locale]}
            </Button>
          )}
          {/* the two decisions on a flag side by side: keep it, or hide it with a reason */}
          {removal === null && flags > 0 && onHide !== undefined && (
            <Button variant="danger" size="touch" className="w-full" onClick={onHide}>
              <EyeOff aria-hidden="true" />
              {forumText.hide[locale]}
            </Button>
          )}
        </div>
      )}

      {error !== null && (
        <p role="alert" className="text-danger-text text-[13px] font-semibold">
          {userErrorMessage(error, locale, forumErrorTexts, forumText.changeFailed)}
        </p>
      )}
    </div>
  );
};

/**
 * Its author changes the title and the text of a post, within a day of writing it or while it
 * is hidden. The photos stay.
 */
export const ForumEditPostSheet: React.FC<{
  post: ForumPostDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: Locale;
}> = ({ post, open, onOpenChange, locale }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const [title, setTitle] = useState(post.title);
  const [text, setText] = useState(post.text);
  const update = useMutation(
    trpc.forum.updateForumPost.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.forum.pathFilter());
        onOpenChange(false);
      },
    }),
  );

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={forumText.editPost[locale]}>
      <div className="flex flex-col gap-3 pb-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-green-800">
            {forumText.postTitle[locale]}
          </span>
          <input
            value={title}
            maxLength={FORUM_TITLE_MAX_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
            className={textInputClassName}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-green-800">
            {forumText.description[locale]}
          </span>
          <textarea
            value={text}
            rows={5}
            maxLength={FORUM_TEXT_MAX_LENGTH}
            onChange={(event) => setText(event.target.value)}
            className={cn(textInputClassName, 'h-auto py-2.5')}
          />
        </label>
        {update.isError && (
          <p role="alert" className="text-danger-text text-[13px] font-semibold">
            {userErrorMessage(update.error, locale, forumErrorTexts, forumText.changeFailed)}
          </p>
        )}
        <Button
          variant="primary"
          size="touch"
          disabled={title.trim() === '' || update.isPending || !isOnline}
          onClick={() => update.mutate({ postId: post.id, title: title.trim(), text: text.trim() })}
        >
          {update.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {forumText.save[locale]}
        </Button>
      </div>
    </BottomSheet>
  );
};
