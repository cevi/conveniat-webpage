jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    NEXT_PUBLIC_APP_HOST_URL: 'http://localhost:3000',
  },
}));

/* eslint-disable import/first */
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
    const legacyPayload = 'Cyrill Püntener joined the group';
    expect(formatMessageContent(legacyPayload, 'de')).toEqual([
      'Cyrill Püntener ist der Gruppe beigetreten',
    ]);
    expect(formatMessageContent(legacyPayload, 'en')).toEqual(['Cyrill Püntener joined the group']);
    expect(formatMessageContent(legacyPayload, 'fr')).toEqual([
      'Cyrill Püntener a rejoint le groupe',
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

  it('provides localized preview text for legacy string payload in getMessagePreviewText', () => {
    const preview = getMessagePreviewText({
      contentVersions: [{ payload: 'Cyrill Püntener joined the group' }],
    });
    expect(preview).toEqual({
      de: 'Cyrill Püntener ist der Gruppe beigetreten',
      en: 'Cyrill Püntener joined the group',
      fr: 'Cyrill Püntener a rejoint le groupe',
    });
  });
});
