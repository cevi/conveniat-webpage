import { SYSTEM_MSG_TYPE_EMERGENCY_ALERT } from '@/lib/chat-shared';
import type { StaticTranslationString } from '@/types/types';

const locationSharedText: StaticTranslationString = {
  de: '📍 Standort geteilt',
  en: '📍 Location shared',
  fr: '📍 Position partagée',
};

/**
 * Extracts a preview text from the last message's content versions.
 * Converts system messages and special messages to a text
 * representation for preview purposes.
 *
 * @param lastMessage
 */
export const getMessagePreviewText = (lastMessage: {
  contentVersions: { payload: unknown }[];
}): string | StaticTranslationString => {
  const payload = lastMessage.contentVersions[0]?.payload;

  if (!payload || typeof payload !== 'object') {
    if (typeof payload === 'string') return payload;
    return '';
  }

  const p = payload as Record<string, unknown>;

  if ('system_msg_type' in p && typeof p['system_msg_type'] === 'string') {
    switch (p['system_msg_type']) {
      case SYSTEM_MSG_TYPE_EMERGENCY_ALERT:
      case 'emergency_alert': {
        return {
          de: '🚨 Notfallwarnung',
          en: '🚨 Emergency Alert',
          fr: "🚨 Alerte d'urgence",
        };
      }
      default: {
        return locationSharedText;
      }
    }
  }

  if ('url' in p && typeof p['url'] === 'string') {
    return {
      de: '📷 Bild',
      en: '📷 Image',
      fr: '📷 Image',
    };
  }

  if (
    'location' in p &&
    typeof p['location'] === 'object' &&
    p['location'] !== null &&
    'latitude' in (p['location'] as Record<string, unknown>) &&
    'longitude' in (p['location'] as Record<string, unknown>)
  ) {
    return locationSharedText;
  }

  // Handle Alert Response and Alert Question
  if ('message' in p && typeof p['message'] === 'string') {
    return p['message'];
  }

  if ('question' in p && typeof p['question'] === 'string') {
    return p['question'];
  }

  return JSON.stringify(p);
};
