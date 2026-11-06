'use client';
import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import { Switch } from '@/components/ui/switch';
import { SettingsRow } from '@/features/settings/components/settings-row';
import { useAuthStatus } from '@/hooks/use-auth-status';
import { useTRPC } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const labels = {
  title: { de: 'Erinnerungen', en: 'Reminders', fr: 'Rappels' },
  explanation: {
    de: 'Für Blöcke mit Erinnerung und alles, wofür du angemeldet bist.',
    en: 'For blocks with a reminder and everything you are enrolled in.',
    fr: 'Pour les blocs avec un rappel et tout ce à quoi tu es inscrit·e.',
  },
  before: { de: 'Vorher', en: 'Before', fr: 'Avant' },
  off: { de: 'Aus', en: 'Off', fr: 'Non' },
  atStart: { de: 'Beim Start', en: 'At the start', fr: 'Au début' },
  failed: {
    de: 'Konnte nicht gespeichert werden. Versuche es nochmals.',
    en: 'Could not be saved. Try again.',
    fr: "N'a pas pu être enregistré. Réessaie.",
  },
} satisfies Record<string, StaticTranslationString>;

/** "Vorher" in minutes; the server refuses any other value. 0 is "Aus". */
const LEAD_OPTIONS = [0, 5, 10, 15, 30] as const;

const DEFAULTS = { leadMinutes: 15, atStart: true };

/**
 * When reminders come: some minutes before a block or shift, and at its start. Applies to every
 * reminder, the ones set with "Erinnern" and the automatic ones of enrolments. Only for a
 * logged-in user, who is the only one with reminders.
 */
export const ReminderSettings: React.FC<{ locale: Locale }> = ({ locale }) => {
  const trpc = useTRPC();
  const status = useAuthStatus();
  const isAuthenticated = status === 'authenticated';
  const queryClient = useQueryClient();
  const { data: settings } = useQuery(
    trpc.schedule.reminders.getReminderSettings.queryOptions(undefined, {
      enabled: isAuthenticated,
      staleTime: 1000 * 60 * 5,
    }),
  );
  const update = useMutation(
    trpc.schedule.reminders.updateReminderSettings.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries(trpc.schedule.reminders.getReminderSettings.pathFilter());
        const previous = queryClient.getQueryData(
          trpc.schedule.reminders.getReminderSettings.queryKey(),
        );
        if (previous !== undefined) {
          queryClient.setQueryData(trpc.schedule.reminders.getReminderSettings.queryKey(), {
            ...previous,
            ...input,
          });
        }
        return { previous };
      },
      onError: (_error, _input, context) => {
        queryClient.setQueryData(
          trpc.schedule.reminders.getReminderSettings.queryKey(),
          context?.previous,
        );
      },
      onSettled: () =>
        queryClient.invalidateQueries(trpc.schedule.reminders.getReminderSettings.pathFilter()),
    }),
  );

  if (!isAuthenticated) return <></>;

  // the persisted query cache may hold a shape from an older version
  const leadMinutes =
    typeof settings?.leadMinutes === 'number' ? settings.leadMinutes : DEFAULTS.leadMinutes;
  const atStart = typeof settings?.atStart === 'boolean' ? settings.atStart : DEFAULTS.atStart;
  const save = (next: { leadMinutes?: number; atStart?: boolean }): void =>
    update.mutate({ leadMinutes, atStart, ...next });

  return (
    <SettingsRow
      title={labels.title[locale]}
      subtitle={labels.explanation[locale]}
      error={update.isError ? labels.failed[locale] : undefined}
    >
      <p className="mb-1.5 text-[13px] font-medium text-green-700">{labels.before[locale]}</p>
      <div role="group" aria-label={labels.before[locale]} className={segmentedTrackClassName}>
        {LEAD_OPTIONS.map((minutes) => (
          <button
            key={minutes}
            type="button"
            onClick={() => save({ leadMinutes: minutes })}
            aria-pressed={minutes === leadMinutes}
            disabled={settings === undefined}
            className={cn(
              segmentClassName(minutes === leadMinutes),
              'flex-1 text-sm font-semibold tabular-nums',
            )}
          >
            {minutes === 0 ? labels.off[locale] : `${minutes} min`}
          </button>
        ))}
      </div>
      <div className="mt-3 flex min-h-11 items-center justify-between gap-3">
        <span className="text-[15px] font-medium text-green-900">{labels.atStart[locale]}</span>
        <Switch
          checked={atStart}
          onCheckedChange={(checked) => save({ atStart: checked })}
          disabled={settings === undefined}
          aria-label={labels.atStart[locale]}
        />
      </div>
    </SettingsRow>
  );
};
