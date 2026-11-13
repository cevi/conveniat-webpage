'use client';

import { Button } from '@/components/ui/buttons/button';
import type { ChatMessage } from '@/features/chat/api/types';
import { ForumFlagReasons, openFlagsOf } from '@/features/chat/components/forum/forum-flag-reasons';
import { forumText } from '@/features/chat/components/forum/forum-texts';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { forumErrorTexts } from '@/lib/forum-error-texts';
import { useTRPC } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { userErrorMessage } from '@/utils/user-error-message';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type React from 'react';

/**
 * Under a flagged comment, for its moderators only: why it was flagged, and the decision right
 * there, so nobody hunts for the comment and its long press. A visible one is kept or hidden
 * with a reason; one the flags hid on their own is approved or left hidden.
 */
export const ForumCommentFlags: React.FC<{
  message: ChatMessage;
  locale: Locale;
  /** hides the comment, with a reason */
  onHide: () => void;
}> = ({ message, locale, onHide }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const refresh = (): void => {
    void queryClient.invalidateQueries(trpc.chat.infiniteMessages.pathFilter());
    void queryClient.invalidateQueries(trpc.forum.pathFilter());
  };
  const restore = useMutation(
    trpc.forum.restoreForumMessage.mutationOptions({ onSettled: refresh }),
  );
  const dismiss = useMutation(trpc.forum.dismissForumFlags.mutationOptions({ onSettled: refresh }));

  const flags = openFlagsOf(message.forumFlags);
  if (flags === undefined) return <></>;
  // absent in a persisted cache from before removals
  const hidden = message.forumRemoval?.kind === 'HIDDEN';
  const busy = restore.isPending || dismiss.isPending || !isOnline;
  const error = restore.error ?? dismiss.error;

  return (
    <div className="mt-1 flex max-w-full flex-col gap-1.5">
      <ForumFlagReasons flags={flags} locale={locale} />
      {/* side by side, each as wide as its label and without icons, so the pair fits under a
          reply on a phone; one under the other only where even that does not fit */}
      <div className="flex flex-wrap gap-2">
        {hidden ? (
          <>
            <Button
              variant="outlined"
              size="touch"
              className="flex-auto px-3"
              disabled={busy}
              onClick={() => restore.mutate({ messageId: message.id })}
            >
              {forumText.approveHidden[locale]}
            </Button>
            <Button
              variant="danger"
              size="touch"
              className="flex-auto px-3"
              disabled={busy}
              onClick={() => dismiss.mutate({ messageId: message.id })}
            >
              {forumText.keepHidden[locale]}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outlined"
              size="touch"
              className="flex-auto px-3"
              disabled={busy}
              onClick={() => dismiss.mutate({ messageId: message.id })}
            >
              {forumText.keepFlagged[locale]}
            </Button>
            <Button
              variant="danger"
              size="touch"
              className="flex-auto px-3"
              disabled={busy}
              onClick={onHide}
            >
              {forumText.hide[locale]}
            </Button>
          </>
        )}
      </div>
      {error !== null && (
        <p role="alert" className="text-danger-text text-[13px] font-semibold">
          {userErrorMessage(error, locale, forumErrorTexts, forumText.changeFailed)}
        </p>
      )}
    </div>
  );
};
