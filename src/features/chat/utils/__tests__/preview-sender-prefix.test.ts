import type { PreviewMessage } from '@/features/chat/types/api-dto-types';
import { previewSenderPrefix } from '@/features/chat/utils/preview-sender-prefix';

const ME = 'user-me';
const OTHER = 'user-other';

const lastMessage = (overrides: Partial<PreviewMessage> = {}): PreviewMessage => ({
  id: 'message-1',
  senderId: OTHER,
  senderName: 'Anna Muster',
  messagePreview: 'Znacht gibt es um sechs',
  createdAt: new Date('2027-07-24T18:00:00Z'),
  status: 'STORED',
  ...overrides,
});

describe('previewSenderPrefix', () => {
  it('marks the own last message in every locale', () => {
    const own = lastMessage({ senderId: ME, senderName: 'Beat Beispiel' });

    expect(previewSenderPrefix(own, 'GROUP', ME, 'de')).toBe('Du: ');
    expect(previewSenderPrefix(own, 'ONE_TO_ONE', ME, 'en')).toBe('You: ');
    expect(previewSenderPrefix(own, 'ONE_TO_ONE', ME, 'fr')).toBe('Vous : ');
  });

  it('names the sender in a group chat', () => {
    expect(previewSenderPrefix(lastMessage(), 'GROUP', ME, 'de')).toBe('Anna Muster: ');
    expect(previewSenderPrefix(lastMessage(), 'GROUP', ME, 'fr')).toBe('Anna Muster : ');
  });

  it('leaves the preview of a one-to-one chat alone, which is named after the sender', () => {
    expect(previewSenderPrefix(lastMessage(), 'ONE_TO_ONE', ME, 'de')).toBe('');
  });

  it('adds nothing to a system message', () => {
    const system = lastMessage({ senderId: 'system', senderName: undefined });

    expect(previewSenderPrefix(system, 'GROUP', ME, 'de')).toBe('');
  });

  it('adds nothing when a list persisted before the sender name existed is restored', () => {
    const cached = lastMessage();
    delete cached.senderName;

    expect(previewSenderPrefix(cached, 'GROUP', ME, 'de')).toBe('');
  });

  it('does not claim a message as the own one while the user is still unknown', () => {
    expect(previewSenderPrefix(lastMessage({ senderId: ME }), 'GROUP', undefined, 'de')).toBe(
      'Anna Muster: ',
    );
  });

  it('adds nothing to a chat without messages', () => {
    expect(previewSenderPrefix(undefined, 'GROUP', ME, 'de')).toBe('');
  });
});
