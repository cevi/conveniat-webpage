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
    const payload = getJoinGroupMessagePayload('Cyrill Püntener');
    expect(payload).toEqual({
      de: 'Cyrill Püntener ist der Gruppe beigetreten',
      en: 'Cyrill Püntener joined the group',
      fr: 'Cyrill Püntener a rejoint le groupe',
    });
  });

  it('generates localized left group message payload', () => {
    const payload = getLeftGroupMessagePayload('Cyrill Püntener');
    expect(payload).toEqual({
      de: 'Cyrill Püntener hat die Gruppe verlassen',
      en: 'Cyrill Püntener left the group',
      fr: 'Cyrill Püntener a quitté le groupe',
    });
  });

  it('generates localized joined as admin message payload', () => {
    const payload = getJoinedAsAdminMessagePayload('Cyrill Püntener');
    expect(payload).toEqual({
      de: 'Cyrill Püntener ist als Admin beigetreten',
      en: 'Cyrill Püntener joined as admin',
      fr: "Cyrill Püntener a rejoint en tant qu'administrateur",
    });
  });

  it('formats localized payload correctly in formatMessageContent', () => {
    const payload = getJoinGroupMessagePayload('Cyrill Püntener');
    expect(formatMessageContent(payload, 'de')).toEqual([
      'Cyrill Püntener ist der Gruppe beigetreten',
    ]);
    expect(formatMessageContent(payload, 'en')).toEqual(['Cyrill Püntener joined the group']);
    expect(formatMessageContent(payload, 'fr')).toEqual(['Cyrill Püntener a rejoint le groupe']);
  });

  it('formats legacy string payload correctly in formatMessageContent', () => {
    const legacyJoinPayload = 'Cyrill Püntener joined the group';
    expect(formatMessageContent(legacyJoinPayload, 'de')).toEqual([
      'Cyrill Püntener ist der Gruppe beigetreten',
    ]);
    expect(formatMessageContent(legacyJoinPayload, 'en')).toEqual([
      'Cyrill Püntener joined the group',
    ]);
    expect(formatMessageContent(legacyJoinPayload, 'fr')).toEqual([
      'Cyrill Püntener a rejoint le groupe',
    ]);

    const legacyLeftPayload = 'Cyrill Püntener left the group';
    expect(formatMessageContent(legacyLeftPayload, 'de')).toEqual([
      'Cyrill Püntener hat die Gruppe verlassen',
    ]);
    expect(formatMessageContent(legacyLeftPayload, 'en')).toEqual([
      'Cyrill Püntener left the group',
    ]);
    expect(formatMessageContent(legacyLeftPayload, 'fr')).toEqual([
      'Cyrill Püntener a quitté le groupe',
    ]);

    const legacyAdminPayload = 'Cyrill Püntener joined as admin';
    expect(formatMessageContent(legacyAdminPayload, 'de')).toEqual([
      'Cyrill Püntener ist als Admin beigetreten',
    ]);
    expect(formatMessageContent(legacyAdminPayload, 'en')).toEqual([
      'Cyrill Püntener joined as admin',
    ]);
    expect(formatMessageContent(legacyAdminPayload, 'fr')).toEqual([
      "Cyrill Püntener a rejoint en tant qu'administrateur",
    ]);
  });

  it('provides localized preview text in getMessagePreviewText', () => {
    const payload = getJoinGroupMessagePayload('Cyrill Püntener');
    const preview = getMessagePreviewText({
      contentVersions: [{ payload }],
    });
    expect(preview).toEqual({
      de: 'Cyrill Püntener ist der Gruppe beigetreten',
      en: 'Cyrill Püntener joined the group',
      fr: 'Cyrill Püntener a rejoint le groupe',
    });
  });

  it('provides localized preview text for legacy string payloads in getMessagePreviewText', () => {
    const joinPreview = getMessagePreviewText({
      contentVersions: [{ payload: 'Cyrill Püntener joined the group' }],
    });
    expect(joinPreview).toEqual({
      de: 'Cyrill Püntener ist der Gruppe beigetreten',
      en: 'Cyrill Püntener joined the group',
      fr: 'Cyrill Püntener a rejoint le groupe',
    });

    const leftPreview = getMessagePreviewText({
      contentVersions: [{ payload: 'Cyrill Püntener left the group' }],
    });
    expect(leftPreview).toEqual({
      de: 'Cyrill Püntener hat die Gruppe verlassen',
      en: 'Cyrill Püntener left the group',
      fr: 'Cyrill Püntener a quitté le groupe',
    });

    const adminPreview = getMessagePreviewText({
      contentVersions: [{ payload: 'Cyrill Püntener joined as admin' }],
    });
    expect(adminPreview).toEqual({
      de: 'Cyrill Püntener ist als Admin beigetreten',
      en: 'Cyrill Püntener joined as admin',
      fr: "Cyrill Püntener a rejoint en tant qu'administrateur",
    });
  });
});
