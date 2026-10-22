'use client';

import { starsCollection } from '@/lib/tanstack-db';
import { trpc } from '@/trpc/client';
import { useSession } from 'next-auth/react';
import { useCallback } from 'react';

export type ReminderEntryKind = 'program' | 'shift';

type ReminderStates = NonNullable<
  ReturnType<ReturnType<typeof trpc.useUtils>['schedule']['reminders']['getReminders']['getData']>
>;

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
  setReminder: (enabled: boolean) => void;
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
  const { status } = useSession();
  const canRemind = status === 'authenticated';
  const utils = trpc.useUtils();

  const { data: reminders } = trpc.schedule.reminders.getReminders.useQuery(undefined, {
    enabled: canRemind,
    staleTime: 1000 * 60 * 5,
  });
  const { data: settings } = trpc.schedule.reminders.getReminderSettings.useQuery(undefined, {
    enabled: canRemind,
    staleTime: 1000 * 60 * 5,
  });

  const state = statesOf(reminders).find((candidate) => candidate.entryId === entryId);

  const mutation = trpc.schedule.reminders.setReminder.useMutation({
    onMutate: async (input) => {
      await utils.schedule.reminders.getReminders.cancel();
      const previous = utils.schedule.reminders.getReminders.getData();
      const others = statesOf(previous).filter((candidate) => candidate.entryId !== input.entryId);
      utils.schedule.reminders.getReminders.setData(undefined, [
        ...others,
        {
          entryId: input.entryId,
          entryKind: input.entryKind,
          isOn: input.enabled,
          isAutomatic: state?.isAutomatic === true,
        },
      ]);
      // the server stars the block too; the local copy follows at once instead of on the next sync
      if (
        input.enabled &&
        input.entryKind === 'program' &&
        starsCollection.get(input.entryId) === undefined
      ) {
        starsCollection.insert({ id: input.entryId, starredAt: Date.now() });
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      utils.schedule.reminders.getReminders.setData(undefined, context?.previous);
    },
    onSettled: () => utils.schedule.reminders.getReminders.invalidate(),
  });

  const { mutate } = mutation;
  const setReminder = useCallback(
    (enabled: boolean) => mutate({ entryId, entryKind, enabled }),
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
