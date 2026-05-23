import { ChatCapability } from '@/lib/chat-shared';
import { ChatMembershipPermission } from '@/lib/prisma/client';
import { Check, X } from 'lucide-react';

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
    de: 'Threads & Antworten',
    en: 'Threads & Replies',
    fr: 'Fils de discussion et réponses',
  },
  THREAD_REPLIES: {
    de: 'Antworten in Threads',
    en: 'Replies in Threads',
    fr: 'Réponses dans les fils',
  },
  EMOJI_REACTIONS: {
    de: 'Emoji-Reaktionen',
    en: 'Emoji Reactions',
    fr: 'Réactions emoji',
  },
};

const allPossibleCapabilities = Object.values(ChatCapability);

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

export const ChatCapabilities: React.FC<ChatCapabilitiesProperties> = ({
  capabilities,
  chatPermission,
  isAnnouncement = false,
  locale,
}) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="font-heading mb-1 text-lg font-semibold text-gray-900">
        {capabilitiesSectionText[locale]}
      </h3>
      <p className="font-body mb-4 text-xs text-gray-500">{adminOnlyRemarkText[locale]}</p>
      <div className="space-y-4">
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

          return (
            <div key={capabilityKey} className="flex items-center justify-between">
              <span className="font-body text-sm font-medium text-gray-700">
                {capabilityLabels[capabilityKey]?.[locale] ?? capabilityKey}
              </span>
              {isEnabled ? (
                <Check className="text-conveniat-green h-5 w-5" strokeWidth={3} />
              ) : (
                <X className="h-5 w-5 text-red-500" strokeWidth={3} />
              )}
            </div>
          );
        })}
        {allPossibleCapabilities.length === 0 && (
          <p className="font-body text-sm text-gray-500 italic">{noCapabilitiesText[locale]}</p>
        )}
      </div>
    </div>
  );
};
