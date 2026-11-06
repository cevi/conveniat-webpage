'use client';
import { Switch } from '@/components/ui/switch';
import { SettingsRow } from '@/features/settings/components/settings-row';
import { useTRPC } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const title: StaticTranslationString = {
  de: 'Auf dem Lagerplatz',
  en: 'On the campsite',
  fr: 'Sur le terrain de camp',
};

const presentText: StaticTranslationString = {
  de: 'Du bist auf dem Lagerplatz angemeldet',
  en: 'You are checked in on the campsite',
  fr: 'Tu es enregistré·e sur le terrain de camp',
};

const absentText: StaticTranslationString = {
  de: 'Nicht auf dem Lagerplatz',
  en: 'Not on the campsite',
  fr: 'Pas sur le terrain de camp',
};

const outsidePeriodText: StaticTranslationString = {
  de: 'Ausserhalb des Erfassungszeitraums',
  en: 'Outside the tracking period',
  fr: 'En dehors de la période de suivi',
};

const failedText: StaticTranslationString = {
  de: 'Konnte nicht gespeichert werden. Versuche es nochmals.',
  en: 'Could not be saved. Try again.',
  fr: "N'a pas pu être enregistré. Réessaie.",
};

/**
 * Whether the user is on the Lagerplatz, as a switch in "Mein Lager". It feeds the count of
 * people on the campsite in the admin panel. The switch moves at once and falls back with a
 * note when saving fails. Leaving can be undone by switching back, so it does not ask first.
 */
export const PresenceSettings: React.FC<{ locale: Locale }> = ({ locale }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: presence } = useQuery(
    trpc.presence.getPresence.queryOptions(undefined, {
      staleTime: 1000 * 60 * 5,
    }),
  );
  const updatePresence = useMutation(
    trpc.presence.updatePresence.mutationOptions({
      onMutate: async ({ presentAtCamp }) => {
        await queryClient.cancelQueries(trpc.presence.getPresence.pathFilter());
        const previous = queryClient.getQueryData(trpc.presence.getPresence.queryKey());
        if (previous !== undefined) {
          queryClient.setQueryData(trpc.presence.getPresence.queryKey(), {
            ...previous,
            isPresent: presentAtCamp,
          });
        }
        return { previous };
      },
      onError: (_error, _input, context) => {
        if (context?.previous !== undefined) {
          queryClient.setQueryData(trpc.presence.getPresence.queryKey(), context.previous);
        }
      },
      onSettled: () => queryClient.invalidateQueries(trpc.presence.getPresence.pathFilter()),
    }),
  );

  // the persisted query cache may hold a shape from an older version
  const isPresent = presence?.isPresent === true;
  const isOutsideTrackingPeriod = presence?.isOutsideTrackingPeriod === true;

  let subtitle = isPresent ? presentText[locale] : absentText[locale];
  if (isOutsideTrackingPeriod && !isPresent) subtitle = outsidePeriodText[locale];

  return (
    <SettingsRow
      title={title[locale]}
      subtitle={subtitle}
      error={updatePresence.isError ? failedText[locale] : undefined}
      action={
        <Switch
          checked={isPresent}
          onCheckedChange={(checked) => updatePresence.mutate({ presentAtCamp: checked })}
          // checking out stays possible after the period, checking in does not
          disabled={presence === undefined || (isOutsideTrackingPeriod && !isPresent)}
          aria-label={title[locale]}
        />
      }
    />
  );
};
