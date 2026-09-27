jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    NEXT_PUBLIC_APP_HOST_URL: 'http://localhost:3000',
  },
}));

import { getMessagePreviewText } from '@/features/chat/api/utils/get-message-preview-text';
import {
  getJoinedAsAdminMessagePayload,
  getJoinGroupMessagePayload,
  getLeftGroupMessagePayload,
} from '@/features/chat/api/utils/system-message-helpers';
import { formatMessageContent } from '@/features/chat/components/chat-view/message/utils/format-message-content';

describe('System Message Helpers and Formatting', () => {
  it('generates localized join group message payload', () => {
    const payload = getJoinGroupMessagePayload('Max Muster');
    expect(payload).toEqual({
      de: 'Max Muster ist der Gruppe beigetreten',
      en: 'Max Muster joined the group',
      fr: 'Max Muster a rejoint le groupe',
    });
  });

  it('generates localized left group message payload', () => {
    const payload = getLeftGroupMessagePayload('Max Muster');
    expect(payload).toEqual({
      de: 'Max Muster hat die Gruppe verlassen',
      en: 'Max Muster left the group',
      fr: 'Max Muster a quitté le groupe',
    });
  });

  it('generates localized joined as admin message payload', () => {
    const payload = getJoinedAsAdminMessagePayload('Max Muster');
    expect(payload).toEqual({
      de: 'Max Muster ist als Admin beigetreten',
      en: 'Max Muster joined as admin',
      fr: "Max Muster a rejoint en tant qu'administrateur",
    });
  });

  it('formats localized payload correctly in formatMessageContent', () => {
    const payload = getJoinGroupMessagePayload('Max Muster');
    expect(formatMessageContent(payload, 'de')).toEqual(['Max Muster ist der Gruppe beigetreten']);
    expect(formatMessageContent(payload, 'en')).toEqual(['Max Muster joined the group']);
    expect(formatMessageContent(payload, 'fr')).toEqual(['Max Muster a rejoint le groupe']);
  });

  it('formats legacy string payload correctly in formatMessageContent', () => {
    const legacyJoinPayload = 'Max Muster joined the group';
    expect(formatMessageContent(legacyJoinPayload, 'de')).toEqual([
      'Max Muster ist der Gruppe beigetreten',
    ]);
    expect(formatMessageContent(legacyJoinPayload, 'en')).toEqual(['Max Muster joined the group']);
    expect(formatMessageContent(legacyJoinPayload, 'fr')).toEqual([
      'Max Muster a rejoint le groupe',
    ]);

    const legacyLeftPayload = 'Max Muster left the group';
    expect(formatMessageContent(legacyLeftPayload, 'de')).toEqual([
      'Max Muster hat die Gruppe verlassen',
    ]);
    expect(formatMessageContent(legacyLeftPayload, 'en')).toEqual(['Max Muster left the group']);
    expect(formatMessageContent(legacyLeftPayload, 'fr')).toEqual([
      'Max Muster a quitté le groupe',
    ]);

    const legacyAdminPayload = 'Max Muster joined as admin';
    expect(formatMessageContent(legacyAdminPayload, 'de')).toEqual([
      'Max Muster ist als Admin beigetreten',
    ]);
    expect(formatMessageContent(legacyAdminPayload, 'en')).toEqual(['Max Muster joined as admin']);
    expect(formatMessageContent(legacyAdminPayload, 'fr')).toEqual([
      "Max Muster a rejoint en tant qu'administrateur",
    ]);
  });

  it('provides localized preview text in getMessagePreviewText', () => {
    const payload = getJoinGroupMessagePayload('Max Muster');
    const preview = getMessagePreviewText({
      contentVersions: [{ payload }],
    });
    expect(preview).toEqual({
      de: 'Max Muster ist der Gruppe beigetreten',
      en: 'Max Muster joined the group',
      fr: 'Max Muster a rejoint le groupe',
    });
  });

  it('provides localized preview text for legacy string payloads in getMessagePreviewText', () => {
    const joinPreview = getMessagePreviewText({
      contentVersions: [{ payload: 'Max Muster joined the group' }],
    });
    expect(joinPreview).toEqual({
      de: 'Max Muster ist der Gruppe beigetreten',
      en: 'Max Muster joined the group',
      fr: 'Max Muster a rejoint le groupe',
    });

    const leftPreview = getMessagePreviewText({
      contentVersions: [{ payload: 'Max Muster left the group' }],
    });
    expect(leftPreview).toEqual({
      de: 'Max Muster hat die Gruppe verlassen',
      en: 'Max Muster left the group',
      fr: 'Max Muster a quitté le groupe',
    });

    const adminPreview = getMessagePreviewText({
      contentVersions: [{ payload: 'Max Muster joined as admin' }],
    });
    expect(adminPreview).toEqual({
      de: 'Max Muster ist als Admin beigetreten',
      en: 'Max Muster joined as admin',
      fr: "Max Muster a rejoint en tant qu'administrateur",
    });
  });
});
