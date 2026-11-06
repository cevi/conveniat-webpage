'use client';
import { useAuthStatus } from '@/hooks/use-auth-status';
import { isStarredRow } from '@/lib/star-sync';
import { setLocalStar, starsCollection } from '@/lib/tanstack-db';
import type { RouterOutputs } from '@/trpc/client';
import { useTRPC } from '@/trpc/client';
import { useCallback } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type ReminderEntryKind = 'program' | 'shift';

type ReminderStates = RouterOutputs['schedule']['reminders']['getReminders'];

/**
 * The reminder states of a persisted query, without whatever an older version left in it. The
 * blob restored from IndexedDB is not checked against the current type.
 */
const statesOf = (value: unknown): ReminderStates =>
  Array.isArray(value)
    ? (value as unknown[]).filter(
        (candidate): candidate is ReminderStates[number] =>
          typeof candidate === 'object' &&
          candidate !== null &&
          typeof (candidate as { entryId?: unknown }).entryId === 'string',
      )
    : [];

interface UseReminderResult {
  /** only a logged-in user can be reminded; for anybody else the button stays away */
  canRemind: boolean;
  /** a push comes before it and at its start */
  isOn: boolean;
  /** the user is enrolled, so it reminds without being asked */
  isAutomatic: boolean;
  /** `false` once it is known that no device of the user receives pushes */
  hasPushDevice: boolean | undefined;
  /** `onError` runs when saving fails, after the reminder has fallen back */
  setReminder: (enabled: boolean, options?: { onError?: () => void }) => void;
  isSaving: boolean;
  isError: boolean;
}

/**
 * The reminder of one entry, the slot of a block or a shift: whether it is on, and the way to
 * switch it. Switching it on stars a block as well, here at once and on the server with it.
 *
 * The reminders come from the persisted query cache, which may hold the shape of an older
 * version, so every field is read as if it could be missing.
 */
export const useReminder = (entryId: string, entryKind: ReminderEntryKind): UseReminderResult => {
  const trpc = useTRPC();
  const status = useAuthStatus();
  const canRemind = status === 'authenticated';
  const queryClient = useQueryClient();

  const { data: reminders } = useQuery(
    trpc.schedule.reminders.getReminders.queryOptions(undefined, {
      enabled: canRemind,
      staleTime: 1000 * 60 * 5,
    }),
  );
  const { data: settings } = useQuery(
    trpc.schedule.reminders.getReminderSettings.queryOptions(undefined, {
      enabled: canRemind,
      staleTime: 1000 * 60 * 5,
    }),
  );

  const state = statesOf(reminders).find((candidate) => candidate.entryId === entryId);

  const mutation = useMutation(
    trpc.schedule.reminders.setReminder.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries(trpc.schedule.reminders.getReminders.pathFilter());
        const previous = queryClient.getQueryData(trpc.schedule.reminders.getReminders.queryKey());
        const others = statesOf(previous).filter(
          (candidate) => candidate.entryId !== input.entryId,
        );
        queryClient.setQueryData(trpc.schedule.reminders.getReminders.queryKey(), [
          ...others,
          {
            entryId: input.entryId,
            entryKind: input.entryKind,
            isOn: input.enabled,
            isAutomatic: state?.isAutomatic === true,
          },
        ]);
        // the server stars the block too; the local copy follows at once instead of on the next sync
        const star = starsCollection.get(input.entryId);
        if (
          input.enabled &&
          input.entryKind === 'program' &&
          (star === undefined || !isStarredRow(star))
        ) {
          setLocalStar(input.entryId, true);
        }
        return { previous };
      },
      onError: (_error, _input, context) => {
        queryClient.setQueryData(
          trpc.schedule.reminders.getReminders.queryKey(),
          context?.previous,
        );
      },
      onSettled: () =>
        queryClient.invalidateQueries(trpc.schedule.reminders.getReminders.pathFilter()),
    }),
  );

  const { mutate } = mutation;
  const setReminder = useCallback(
    (enabled: boolean, options?: { onError?: () => void }) =>
      mutate({ entryId, entryKind, enabled }, { onError: () => options?.onError?.() }),
    [entryId, entryKind, mutate],
  );

  return {
    canRemind,
    isOn: state?.isOn === true,
    isAutomatic: state?.isAutomatic === true,
    hasPushDevice:
      typeof settings?.hasPushDevice === 'boolean' ? settings.hasPushDevice : undefined,
    setReminder,
    isSaving: mutation.isPending,
    isError: mutation.isError,
  };
};
