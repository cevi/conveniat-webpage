import { SectionLabel } from '@/components/ui/section-label';
import { ChatCapability } from '@/lib/chat-shared';
import { ChatMembershipPermission } from '@/lib/prisma/client';
import { cn } from '@/utils/tailwindcss-override';
import { Check, Minus } from 'lucide-react';

import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';

interface ChatCapabilitiesProperties {
  capabilities: string[];
  chatPermission?: ChatMembershipPermission | undefined;
  isAnnouncement?: boolean;
  locale: Locale;
}

const capabilitiesSectionText: StaticTranslationString = {
  de: 'Chat-Funktionen',
  en: 'Chat Capabilities',
  fr: 'Fonctionnalités du chat',
};

const capabilityLabels: Record<string, StaticTranslationString> = {
  PICTURE_UPLOAD: {
    de: 'Bilder senden',
    en: 'Send Pictures',
    fr: 'Envoyer des images',
  },
  CAN_SEND_MESSAGES: {
    de: 'Nachrichten senden',
    en: 'Send Messages',
    fr: 'Envoyer des messages',
  },
  THREADS: {
    de: 'Im Thread antworten',
    en: 'Reply in thread',
    fr: 'Répondre dans le fil',
  },
  EMOJI_REACTIONS: {
    de: 'Emoji-Reaktionen',
    en: 'Emoji Reactions',
    fr: 'Réactions emoji',
  },
};

/**
 * THREAD_REPLIES only lets guests reply in threads, which members may do anyway, so it has no
 * row of its own: it decides whether the thread row is ticked for a guest.
 */
const allPossibleCapabilities = Object.values(ChatCapability).filter(
  (capability) => capability !== ChatCapability.THREAD_REPLIES,
);

const adminOnlyRemarkText: StaticTranslationString = {
  de: 'Diese Einstellungen können nicht geändert werden.',
  en: 'These settings cannot be changed.',
  fr: 'Ces paramètres ne peuvent pas être modifiés.',
};

const noCapabilitiesText: StaticTranslationString = {
  de: 'Keine speziellen Funktionen definiert.',
  en: 'No special capabilities defined.',
  fr: 'Aucune fonctionnalité spéciale définie.',
};

const enabledText: StaticTranslationString = {
  de: 'Erlaubt',
  en: 'Allowed',
  fr: 'Autorisé',
};

const disabledText: StaticTranslationString = {
  de: 'Nicht erlaubt',
  en: 'Not allowed',
  fr: 'Non autorisé',
};

export const ChatCapabilities: React.FC<ChatCapabilitiesProperties> = ({
  capabilities,
  chatPermission,
  isAnnouncement = false,
  locale,
}) => {
  return (
    <section>
      <SectionLabel>{capabilitiesSectionText[locale]}</SectionLabel>
      <p className="mt-1 mb-2 text-[13px] text-green-700">{adminOnlyRemarkText[locale]}</p>
      <ul className="border-line divide-line divide-y overflow-hidden rounded-[14px] border bg-white">
        {allPossibleCapabilities.map((capabilityKey) => {
          let isEnabled = capabilities.includes(capabilityKey);

          if (isAnnouncement) {
            const isAdmin =
              chatPermission === ChatMembershipPermission.OWNER ||
              chatPermission === ChatMembershipPermission.ADMIN;
            if (
              !isAdmin &&
              (capabilityKey === ChatCapability.CAN_SEND_MESSAGES ||
                capabilityKey === ChatCapability.PICTURE_UPLOAD)
            ) {
              isEnabled = false;
            }
          } else if (
            chatPermission === ChatMembershipPermission.GUEST &&
            (capabilityKey === ChatCapability.CAN_SEND_MESSAGES ||
              capabilityKey === ChatCapability.PICTURE_UPLOAD)
          ) {
            isEnabled = false;
          }

          if (
            capabilityKey === ChatCapability.THREADS &&
            chatPermission === ChatMembershipPermission.GUEST &&
            !capabilities.includes(ChatCapability.THREAD_REPLIES)
          ) {
            isEnabled = false;
          }

          return (
            <li
              key={capabilityKey}
              className="flex min-h-12 items-center justify-between gap-3 px-4 py-2.5"
            >
              <span
                className={cn(
                  'text-[15px]',
                  isEnabled ? 'font-semibold text-green-900' : 'text-green-700',
                )}
              >
                {capabilityLabels[capabilityKey]?.[locale] ?? capabilityKey}
              </span>
              {isEnabled ? (
                <Check
                  className="text-conveniat-green h-5 w-5"
                  strokeWidth={3}
                  aria-label={enabledText[locale]}
                  role="img"
                />
              ) : (
                <Minus
                  className="h-5 w-5 text-green-500"
                  strokeWidth={3}
                  aria-label={disabledText[locale]}
                  role="img"
                />
              )}
            </li>
          );
        })}
        {allPossibleCapabilities.length === 0 && (
          <li className="px-4 py-3 text-[15px] text-green-700">{noCapabilitiesText[locale]}</li>
        )}
      </ul>
    </section>
  );
};
