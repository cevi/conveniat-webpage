'use client';

import { useInAppDesign } from '@/features/chat/context/in-app-design-context';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { useTRPC } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { getPushSubscription } from '@/utils/push-notifications/push-manager-utils';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import type React from 'react';

const phoneGetsPushText: StaticTranslationString = {
  de: 'Neue Nachrichten meldet dir die App auf dem Handy.',
  en: 'The app on your phone tells you about new messages.',
  fr: 'L’app sur ton téléphone t’annonce les nouveaux messages.',
};

/**
 * One line over the composer in a desktop browser, telling where a reply will reach the user:
 * on their phone, which takes push through the app, while this browser takes none. It stays away
 * whenever it would not be true, in a muted chat, or before both sides are known.
 */
export const PhonePushHint: React.FC<{ chatId: string }> = ({ chatId }) => {
  const trpc = useTRPC();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const inAppDesign = useInAppDesign();
  const isDesktop = useIsDesktop();
  const isRelevant = !inAppDesign && isDesktop;

  const phone = useQuery(
    trpc.nativePush.getPhonePushStatus.queryOptions(undefined, {
      enabled: isRelevant,
      staleTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
    }),
  );
  // read locally, no request: a browser that holds a subscription is notified itself
  const browserSubscription = useQuery({
    queryKey: ['browserPushSubscription'],
    meta: { persist: false },
    queryFn: async () => (await getPushSubscription()) !== undefined,
    enabled: isRelevant,
  });
  // the list beside the chat keeps it fresh; read here without a request of its own
  const { data: chats } = useQuery(trpc.chat.chats.queryOptions({}, { enabled: false }));
  const isMuted = chats?.find((chat) => chat.id === chatId)?.isMuted === true;

  if (
    !isRelevant ||
    isMuted ||
    phone.data?.hasActivePhone !== true ||
    browserSubscription.data !== false
  ) {
    return <></>;
  }

  return (
    <p className="border-line bg-quiet flex items-center gap-2.5 border-t px-5 py-2.5 text-sm text-green-700">
      <Bell className="h-4 w-4 shrink-0" aria-hidden="true" />
      {phoneGetsPushText[locale]}
    </p>
  );
};
