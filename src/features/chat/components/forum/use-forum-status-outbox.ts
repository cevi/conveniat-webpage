'use client';
import { isRetryableSendError } from '@/features/chat/utils/send-errors';
import { useOnlineStatus } from '@/hooks/use-online-status';
import {
  FORUM_STATUS_FAILURES_STORAGE_KEY,
  FORUM_STATUS_OUTBOX_STORAGE_KEY,
} from '@/lib/chat-local-storage';
import type { ForumPostStatusValue } from '@/lib/forum-shared';
import { useTRPC } from '@/trpc/client';
import { TRPCClientError } from '@trpc/client';
import { useCallback, useEffect, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Status changes of forum posts that wait for a connection. A helper reports a post as done
 * where the work is, often without signal; the change is kept here and sent once the phone is
 * back online. Its own queue rather than the chat's: a release that does not know it must not
 * read it as a message. Kept in localStorage and cleared on logout with the chat's.
 */
interface QueuedStatusChange {
  postId: string;
  status: ForumPostStatusValue;
  note?: string | undefined;
  userId: string;
  queuedAt: string;
}

const OUTBOX_EVENT = 'conveniat:forum-status-outbox-updated';
const FAILURE_EVENT = 'conveniat:forum-status-failed';

const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown, event: string): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    globalThis.dispatchEvent(new Event(event));
  } catch {
    // storage blocked: the change stays in memory for this page only
  }
};

const readOutbox = (): QueuedStatusChange[] => {
  const items = read<unknown>(FORUM_STATUS_OUTBOX_STORAGE_KEY, []);
  return Array.isArray(items)
    ? items.filter(
        (item): item is QueuedStatusChange =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as QueuedStatusChange).postId === 'string' &&
          typeof (item as QueuedStatusChange).status === 'string',
      )
    : [];
};

/** One change per post: a newer one replaces what was queued before it. */
const enqueue = (change: QueuedStatusChange): void => {
  const outbox = readOutbox().filter((item) => item.postId !== change.postId);
  write(FORUM_STATUS_OUTBOX_STORAGE_KEY, [...outbox, change], OUTBOX_EVENT);
};

const dequeue = (postId: string): void => {
  write(
    FORUM_STATUS_OUTBOX_STORAGE_KEY,
    readOutbox().filter((item) => item.postId !== postId),
    OUTBOX_EVENT,
  );
};

const recordFailure = (postId: string, reason: string): void => {
  const failures = read<Record<string, string>>(FORUM_STATUS_FAILURES_STORAGE_KEY, {});
  write(FORUM_STATUS_FAILURES_STORAGE_KEY, { ...failures, [postId]: reason }, FAILURE_EVENT);
};

/** The reason a queued change of this post was refused, until the post is changed again. */
export const useForumStatusFailure = (postId: string): string | undefined => {
  const [reason, setReason] = useState<string | undefined>();
  useEffect(() => {
    const update = (): void =>
      setReason(read<Record<string, string>>(FORUM_STATUS_FAILURES_STORAGE_KEY, {})[postId]);
    update();
    globalThis.addEventListener(FAILURE_EVENT, update);
    return (): void => globalThis.removeEventListener(FAILURE_EVENT, update);
  }, [postId]);
  return reason;
};

const clearFailure = (postId: string): void => {
  const failures = read<Record<string, string>>(FORUM_STATUS_FAILURES_STORAGE_KEY, {});
  if (!(postId in failures)) return;
  const rest = Object.fromEntries(Object.entries(failures).filter(([key]) => key !== postId));
  write(FORUM_STATUS_FAILURES_STORAGE_KEY, rest, FAILURE_EVENT);
};

const reasonOf = (error: unknown): string => {
  if (!(error instanceof TRPCClientError)) return 'unknown';
  const reason = (error.data as { reason?: unknown } | undefined)?.reason;
  return typeof reason === 'string' ? reason : 'unknown';
};

/**
 * Changes the status of a post now, or queues the change when there is no connection. Resolves
 * to `queued` when it waits for one, `sent` when the server took it.
 */
export const useForumStatusChange = (): ((change: {
  postId: string;
  status: ForumPostStatusValue;
  note?: string | undefined;
}) => Promise<'sent' | 'queued'>) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const { mutateAsync } = useMutation(
    trpc.forum.updateForumPostStatus.mutationOptions({ networkMode: 'always' }),
  );

  return useCallback(
    async (change) => {
      clearFailure(change.postId);
      const userId = await queryClient.query({
        ...trpc.chat.user.queryOptions({}),
        staleTime: 'static',
      });
      const queued: QueuedStatusChange = {
        ...change,
        userId,
        queuedAt: new Date().toISOString(),
      };
      if (!isOnline) {
        enqueue(queued);
        return 'queued';
      }
      try {
        await mutateAsync(change);
      } catch (error) {
        if (!isRetryableSendError(error)) throw error;
        enqueue(queued);
        return 'queued';
      }
      void queryClient.invalidateQueries(trpc.forum.pathFilter());
      return 'sent';
    },
    [isOnline, mutateAsync, queryClient, trpc],
  );
};

let isDraining = false;

/**
 * Sends the queued status changes once the phone is online, from the app shell, so a change
 * made offline goes out even if the forum is never opened again. A change the server refuses
 * (the assignment was withdrawn, someone else reported it done first) leaves the queue, and
 * its reason waits on the post.
 */
const useForumStatusOutboxDrain = (): void => {
  const trpc = useTRPC();
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const { mutateAsync } = useMutation(
    trpc.forum.updateForumPostStatus.mutationOptions({ networkMode: 'always' }),
  );

  useEffect(() => {
    const drain = async (): Promise<void> => {
      if (!isOnline || isDraining || readOutbox().length === 0) return;
      isDraining = true;
      let sent = 0;
      try {
        let userId: string;
        try {
          userId = await queryClient.query({
            ...trpc.chat.user.queryOptions({}),
            staleTime: 'static',
          });
        } catch {
          return;
        }
        for (const change of readOutbox().filter((item) => item.userId === userId)) {
          try {
            await mutateAsync({
              postId: change.postId,
              status: change.status,
              ...(change.note === undefined ? {} : { note: change.note }),
            });
            dequeue(change.postId);
            sent++;
          } catch (error) {
            if (isRetryableSendError(error)) break;
            dequeue(change.postId);
            recordFailure(change.postId, reasonOf(error));
          }
        }
      } finally {
        isDraining = false;
      }
      if (sent > 0) void queryClient.invalidateQueries(trpc.forum.pathFilter());
    };

    void drain();
    const interval = globalThis.setInterval(() => void drain(), 15_000);
    const onEvent = (): void => void drain();
    globalThis.addEventListener('online', onEvent);
    globalThis.addEventListener(OUTBOX_EVENT, onEvent);
    return (): void => {
      globalThis.clearInterval(interval);
      globalThis.removeEventListener('online', onEvent);
      globalThis.removeEventListener(OUTBOX_EVENT, onEvent);
    };
  }, [isOnline, mutateAsync, queryClient, trpc]);
};

/** Mounts the drain in the app shell, beside the chat's `OfflineQueueSync`. */
export const ForumStatusOutboxSync = (): null => {
  useForumStatusOutboxDrain();
  return null;
};
