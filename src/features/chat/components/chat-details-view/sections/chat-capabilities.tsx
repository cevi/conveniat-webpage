import { SectionLabel } from '@/components/ui/section-label';
import { ChatCapability } from '@/lib/chat-shared';
import { ChatMembershipPermission } from '@/lib/prisma/client';
import { cn } from '@/utils/tailwindcss-override';
import { Ban, Check, Lock } from 'lucide-react';

import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';

interface ChatCapabilitiesProperties {
  capabilities: string[];
  chatPermission?: ChatMembershipPermission | undefined;
  isAnnouncement?: boolean;
  locale: Locale;
}

const capabilitiesSectionText: StaticTranslationString = {
  de: 'In diesem Chat',
  en: 'In this chat',
  fr: 'Dans ce chat',
};

/** What a chip says, with the capability and without it. */
const capabilityLabels: Record<
  string,
  { on: StaticTranslationString; off: StaticTranslationString }
> = {
  CAN_SEND_MESSAGES: {
    on: { de: 'Nachrichten', en: 'Messages', fr: 'Messages' },
    off: { de: 'Keine Nachrichten', en: 'No messages', fr: 'Pas de messages' },
  },
  PICTURE_UPLOAD: {
    on: { de: 'Bilder', en: 'Pictures', fr: 'Images' },
    off: { de: 'Keine Bilder', en: 'No pictures', fr: "Pas d'images" },
  },
  THREADS: {
    on: { de: 'Threads', en: 'Threads', fr: 'Fils' },
    off: { de: 'Keine Threads', en: 'No threads', fr: 'Pas de fils' },
  },
  EMOJI_REACTIONS: {
    on: { de: 'Reaktionen', en: 'Reactions', fr: 'Réactions' },
    off: { de: 'Keine Reaktionen', en: 'No reactions', fr: 'Pas de réactions' },
  },
};

/**
 * THREAD_REPLIES only lets guests reply in threads, which members may do anyway, so it has no
 * chip of its own: it decides whether the thread chip is on for a guest.
 */
const allPossibleCapabilities = Object.values(ChatCapability).filter(
  (capability) => capability !== ChatCapability.THREAD_REPLIES,
);

const fixedForTypeText: StaticTranslationString = {
  de: 'Für diesen Chat-Typ festgelegt',
  en: 'Set for this type of chat',
  fr: 'Défini pour ce type de chat',
};

const isCapabilityEnabled = (
  capabilityKey: ChatCapability,
  capabilities: string[],
  chatPermission: ChatMembershipPermission | undefined,
  isAnnouncement: boolean,
): boolean => {
  let isEnabled = capabilities.includes(capabilityKey);
  const isSending =
    capabilityKey === ChatCapability.CAN_SEND_MESSAGES ||
    capabilityKey === ChatCapability.PICTURE_UPLOAD;
  if (isAnnouncement) {
    const isAdmin =
      chatPermission === ChatMembershipPermission.OWNER ||
      chatPermission === ChatMembershipPermission.ADMIN;
    if (!isAdmin && isSending) isEnabled = false;
  } else if (chatPermission === ChatMembershipPermission.GUEST && isSending) {
    isEnabled = false;
  }
  if (
    capabilityKey === ChatCapability.THREADS &&
    chatPermission === ChatMembershipPermission.GUEST &&
    !capabilities.includes(ChatCapability.THREAD_REPLIES)
  ) {
    isEnabled = false;
  }
  return isEnabled;
};

/**
 * What can be done in the chat, as read-only chips: a tick for what is on, a dashed chip for
 * what is off. Nobody can change them, the chat's type decides, and the note says so.
 */
export const ChatCapabilities: React.FC<ChatCapabilitiesProperties> = ({
  capabilities,
  chatPermission,
  isAnnouncement = false,
  locale,
}) => {
  const chips = allPossibleCapabilities
    .map((key) => ({
      key,
      isEnabled: isCapabilityEnabled(key, capabilities, chatPermission, isAnnouncement),
    }))
    // what is on first, as the design reads
    .sort((a, b) => Number(b.isEnabled) - Number(a.isEnabled));

  return (
    <section>
      <SectionLabel className="mb-2">{capabilitiesSectionText[locale]}</SectionLabel>
      <ul className="flex flex-wrap gap-2">
        {chips.map(({ key, isEnabled }) => {
          const label = capabilityLabels[key]?.[isEnabled ? 'on' : 'off'][locale] ?? key;
          return (
            <li
              key={key}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px]',
                isEnabled
                  ? 'border-line bg-white font-semibold text-green-900'
                  : 'border-rail-dash border-dashed text-green-700',
              )}
            >
              {isEnabled ? (
                <Check
                  className="text-conveniat-green h-4 w-4"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              ) : (
                <Ban className="h-4 w-4" aria-hidden="true" />
              )}
              {label}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 flex items-center gap-1.5 text-[13px] text-green-700">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        {fixedForTypeText[locale]}
      </p>
    </section>
  );
};
