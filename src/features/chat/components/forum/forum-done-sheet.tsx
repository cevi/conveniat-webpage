'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { textInputClassName } from '@/components/ui/field';
import type { ForumPostDetail } from '@/features/chat/api/forum/forum-queries';
import { forumText } from '@/features/chat/components/forum/forum-texts';
import { useForumStatusChange } from '@/features/chat/components/forum/use-forum-status-outbox';
import { forumErrorTexts } from '@/lib/forum-error-texts';
import { FORUM_NOTE_MAX_LENGTH } from '@/lib/forum-shared';
import type { Locale } from '@/types/types';
import { userErrorMessage } from '@/utils/user-error-message';
import { CheckCircle2, Loader2 } from 'lucide-react';
import React, { useState } from 'react';

/**
 * A helper reports their post as done, with what they did. Works without signal: the change
 * waits in the queue and goes out once the phone is online again.
 */
export const ForumDoneSheet: React.FC<{
  post: ForumPostDetail;
  locale: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ post, locale, open, onOpenChange }) => {
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'queued'>('idle');
  const [error, setError] = useState<string | undefined>();
  const changeStatus = useForumStatusChange();

  const submit = async (): Promise<void> => {
    setState('sending');
    setError(undefined);
    try {
      const outcome = await changeStatus({
        postId: post.id,
        status: 'DONE',
        note: note.trim() === '' ? undefined : note.trim(),
      });
      if (outcome === 'queued') {
        setState('queued');
        return;
      }
      setState('idle');
      setNote('');
      onOpenChange(false);
    } catch (error_) {
      setState('idle');
      setError(userErrorMessage(error_, locale, forumErrorTexts, forumText.changeFailed));
    }
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={forumText.reportDone[locale]}
      description={post.title}
      footer={
        <button
          type="button"
          disabled={state === 'sending'}
          onClick={() => void submit()}
          className="bg-conveniat-green focus-visible:focus-surface-filled flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {state === 'sending' ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          )}
          {forumText.reportDone[locale]}
        </button>
      }
    >
      <div className="flex flex-col gap-3 pb-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-green-800">
            {forumText.statusNote[locale]}
          </span>
          <textarea
            value={note}
            maxLength={FORUM_NOTE_MAX_LENGTH}
            rows={3}
            onChange={(event) => setNote(event.target.value)}
            className={textInputClassName}
          />
        </label>
        <p className="text-[13px] text-green-700">{forumText.doneNotifies[locale]}</p>
        {state === 'queued' && (
          <p role="status" className="bg-quiet rounded-xl px-3 py-2 text-[13px] text-green-800">
            {forumText.queuedOffline[locale]}
          </p>
        )}
        {error !== undefined && (
          <p
            role="alert"
            className="bg-danger-soft text-danger-text rounded-xl px-3 py-2 text-[13px] font-medium"
          >
            {error}
          </p>
        )}
      </div>
    </BottomSheet>
  );
};
