'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/buttons/button';
import { textInputClassName } from '@/components/ui/field';
import { forumText } from '@/features/chat/components/forum/forum-texts';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { forumErrorTexts } from '@/lib/forum-error-texts';
import {
  FORUM_FLAG_REASONS,
  FORUM_NOTE_MAX_LENGTH,
  type ForumFlagReasonValue,
  forumFlagReasonLabel,
} from '@/lib/forum-shared';
import { useTRPC } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { userErrorMessage } from '@/utils/user-error-message';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

/**
 * Picks a reason, one of the flag reasons, with an optional note: for a participant's flag and
 * for a moderator's hide or delete, which share the reasons, so a moderator answers a flag in
 * its own words.
 */
export const ReasonPicker: React.FC<{
  reason: ForumFlagReasonValue | undefined;
  onReason: (reason: ForumFlagReasonValue) => void;
  note: string;
  onNote: (note: string) => void;
  noteLabel: string;
  locale: Locale;
}> = ({ reason, onReason, note, onNote, noteLabel, locale }) => (
  <div className="flex flex-col gap-3">
    <fieldset className="border-line divide-line flex flex-col divide-y rounded-[14px] border bg-white">
      <legend className="sr-only">{forumText.reason[locale]}</legend>
      {FORUM_FLAG_REASONS.map((value) => (
        <label
          key={value}
          className="focus-within:focus-row flex min-h-[52px] cursor-pointer items-center gap-3 px-4 text-[15px] font-semibold text-green-900"
        >
          <input
            type="radio"
            name="forum-reason"
            value={value}
            checked={reason === value}
            onChange={() => onReason(value)}
            className="accent-conveniat-green h-5 w-5"
          />
          {forumFlagReasonLabel[value][locale]}
        </label>
      ))}
    </fieldset>
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-green-800">{noteLabel}</span>
      <textarea
        value={note}
        maxLength={FORUM_NOTE_MAX_LENGTH}
        rows={2}
        onChange={(event) => onNote(event.target.value)}
        className={cn(textInputClassName, 'h-auto py-2.5')}
      />
    </label>
  </div>
);

/**
 * "Melden": a participant flags a post or a comment for the topic's Kernteam. Enough flags hide
 * it until the Kernteam decides; an emergency belongs in the Notfall tab, which the sheet says.
 */
export const ForumFlagSheet: React.FC<{
  messageId: string | undefined;
  postId: string;
  isComment: boolean;
  topicName: string;
  onClose: () => void;
  locale: Locale;
}> = ({ messageId, postId, isComment, topicName, onClose, locale }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const [reason, setReason] = useState<ForumFlagReasonValue | undefined>();
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const flag = useMutation(
    trpc.forum.createForumFlag.mutationOptions({
      onSuccess: () => {
        setDone(true);
        void queryClient.invalidateQueries(trpc.forum.getForumPost.queryFilter({ postId }));
      },
    }),
  );

  return (
    <BottomSheet
      open={messageId !== undefined}
      onOpenChange={(open) => {
        if (open) return;
        onClose();
        setReason(undefined);
        setNote('');
        setDone(false);
        flag.reset();
      }}
      title={isComment ? forumText.flagCommentTitle[locale] : forumText.flagTitle[locale]}
      description={forumText.flagExplain[locale].replace('{topic}', topicName)}
    >
      {done ? (
        <p className="bg-tint rounded-xl px-3 py-3 text-[15px] text-green-900" role="status">
          {forumText.flagged[locale]}
        </p>
      ) : (
        <div className="flex flex-col gap-3 pb-2">
          <ReasonPicker
            reason={reason}
            onReason={setReason}
            note={note}
            onNote={setNote}
            noteLabel={forumText.flagNote[locale]}
            locale={locale}
          />
          <p className="bg-quiet rounded-xl px-3 py-2.5 text-[13px] text-green-900">
            {forumText.flagEmergency[locale]}
          </p>
          {flag.isError && (
            <p role="alert" className="text-danger-text text-[13px] font-semibold">
              {userErrorMessage(flag.error, locale, forumErrorTexts, forumText.changeFailed)}
            </p>
          )}
          <Button
            variant="primary"
            size="touch"
            disabled={reason === undefined || flag.isPending || !isOnline}
            onClick={() => {
              if (messageId === undefined || reason === undefined) return;
              flag.mutate({ messageId, reason, ...(note.trim() === '' ? {} : { note }) });
            }}
          >
            {flag.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {forumText.flag[locale]}
          </Button>
        </div>
      )}
    </BottomSheet>
  );
};
