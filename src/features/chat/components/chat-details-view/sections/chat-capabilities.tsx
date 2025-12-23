import { ChatCapability } from '@/lib/chat-shared';
// ... imports

// ...

import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';

interface ChatCapabilitiesProperties {
  capabilities: Array<{
    capability: string;
    isEnabled: boolean;
  }>;
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
          const capability = capabilities.find((c) => c.capability === (capabilityKey as string));
          const isEnabled = capability?.isEnabled ?? false;
          return (
            <div key={capabilityKey} className="flex items-center justify-between">
              <span className="font-body text-sm font-medium text-gray-700">
                {capabilityLabels[capabilityKey]?.[locale] ?? capabilityKey}
              </span>
              <div
                className={`h-6 w-11 rounded-full p-1 opacity-50 transition-colors ${isEnabled ? 'bg-conveniat-green' : 'bg-gray-300'
                  }`}
              >
                <div
                  className={`h-4 w-4 rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </div>
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
