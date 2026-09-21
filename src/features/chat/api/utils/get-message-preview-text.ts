import {
  getJoinedAsAdminMessagePayload,
  getJoinGroupMessagePayload,
  getLeftGroupMessagePayload,
} from '@/features/chat/api/utils/system-message-helpers';
import { SYSTEM_MSG_TYPE_EMERGENCY_ALERT } from '@/lib/chat-shared';
import type { StaticTranslationString } from '@/types/types';
import { stripMarkdownFormatting } from '@/utils/strip-markdown-formatting';

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
 * Author-written text is run through {@link stripMarkdownFormatting}: the chat
 * overview shows the preview as plain text, so the markers of the dialect
 * `format-message-content.tsx` renders (`*bold*`, `_italic_`, `~struck~`,
 * `[label](url)`) would otherwise leak through verbatim - a link even showing
 * its whole URL instead of the label the reader sees in the bubble.
 *
 * @param lastMessage
 */
export const getMessagePreviewText = (lastMessage: {
  contentVersions: { payload: unknown }[];
}): string | StaticTranslationString => {
  const payload = lastMessage.contentVersions[0]?.payload;

  if (payload === undefined || payload === null || typeof payload !== 'object') {
    if (typeof payload === 'string') {
      const joinedMatch = payload.match(/^(.+) joined the group$/);
      if (joinedMatch?.[1]) {
        return getJoinGroupMessagePayload(joinedMatch[1]);
      }

      const leftMatch = payload.match(/^(.+) left the group$/);
      if (leftMatch?.[1]) {
        return getLeftGroupMessagePayload(leftMatch[1]);
      }

      const joinedAdminMatch = payload.match(/^(.+) joined as admin$/);
      if (joinedAdminMatch?.[1]) {
        return getJoinedAsAdminMessagePayload(joinedAdminMatch[1]);
      }

      return stripMarkdownFormatting(payload);
    }
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

  if ('text' in p && typeof p['text'] === 'string') {
    return stripMarkdownFormatting(p['text']);
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
    return stripMarkdownFormatting(p['message']);
  }

  if ('question' in p && typeof p['question'] === 'string') {
    return stripMarkdownFormatting(p['question']);
  }

  // Handle system messages and announcements with translations
  const languageKeys = ['de', 'en', 'fr'] as const;
  const hasLangKey = languageKeys.some((key) => key in p);

  if (hasLangKey) {
    const deValue = p['de'];
    const enValue = p['en'];
    const frValue = p['fr'];

    const extractText = (val: unknown): string => {
      if (val === undefined || val === null) return '';
      if (typeof val === 'string') return stripMarkdownFormatting(val);
      if (typeof val === 'object') {
        const objectValue = val as Record<string, unknown>;
        const nested = objectValue['text'] ?? objectValue['body'] ?? objectValue['title'] ?? '';
        return typeof nested === 'string' ? stripMarkdownFormatting(nested) : '';
      }
      return '';
    };

    const deString = extractText(deValue);
    const enString = extractText(enValue);
    const frString = extractText(frValue);

    const hasAnyContent = deString !== '' || enString !== '' || frString !== '';
    if (hasAnyContent) {
      const fallbackLanguage = enString === '' ? frString : enString;
      const firstAvailable = deString === '' ? fallbackLanguage : deString;

      return {
        de: deString === '' ? firstAvailable : deString,
        en: enString === '' ? firstAvailable : enString,
        fr: frString === '' ? firstAvailable : frString,
      };
    }
  }

  return JSON.stringify(p);
};
