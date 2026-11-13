/**
 * @jest-environment jsdom
 */
import type { ForumProtocolEntry } from '@/features/chat/api/forum/forum-protocol';
import { ForumProtocolView } from '@/features/chat/components/forum/forum-protocol-view';
import { createTestTrpc, testTrpcError } from '@/trpc/test-trpc';
import { render, screen } from '@testing-library/react';

const TOPIC_ID = '7f1c2a90-0000-4000-8000-000000000001';

jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));
jest.mock('@/components/offline-banner', () => ({ OfflineBanner: (): null => null }));
// the forum's own back bar stands in for the app header, which these tests do not render
jest.mock('@/components/header/hide-header-context', () => ({ SetHideHeader: (): null => null }));
jest.mock('next/navigation', () => ({
  useParams: (): object => ({ topicId: '7f1c2a90-0000-4000-8000-000000000001' }),
  useRouter: (): object => ({ back: jest.fn(), replace: jest.fn() }),
}));
jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

const entry = (overrides: Partial<ForumProtocolEntry>): ForumProtocolEntry => ({
  id: 'entry',
  at: new Date(),
  action: 'STATUS_CHANGED',
  actorName: 'Lea',
  capacity: 'TOPIC_ADMIN',
  delegatedByName: null,
  postId: 'post',
  postTitle: 'Zu heisses Wasser',
  inConversation: false,
  note: null,
  ...overrides,
});

const renderProtocol = (protocol: () => unknown): void => {
  const { wrapper } = createTestTrpc({
    'forum.getForumTopicList': () => [{ id: TOPIC_ID, name: 'Platz & Infrastruktur' }],
    'forum.getForumProtocolList': protocol,
  });
  render(<ForumProtocolView />, { wrapper });
};

describe('the protocol of a topic', () => {
  it('shows what was hidden, why, and the text that is gone', async () => {
    renderProtocol(() => ({
      items: [
        entry({
          action: 'HIDDEN',
          reason: 'PERSONAL_DATA',
          postTitle: 'Telefonliste',
          removedText: 'Ruft Nina an unter 079 000 00 00',
        }),
      ],
      nextCursor: null,
    }));

    expect(await screen.findByText(/blendete aus/)).toBeTruthy();
    expect(screen.getByText('Lea')).toBeTruthy();
    expect(screen.getByText('Heute')).toBeTruthy();
    expect(screen.getByText(/«Telefonliste» · Persönliche Daten/)).toBeTruthy();
    expect(screen.getByText('Ruft Nina an unter 079 000 00 00')).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toBe('/app/forum/post');
    expect(await screen.findByText('Platz & Infrastruktur')).toBeTruthy();
  });

  it('shows of a private conversation its title only', async () => {
    renderProtocol(() => ({
      items: [
        entry({
          action: 'STATUS_CHANGED',
          postTitle: 'Frage zur Anreise',
          inConversation: true,
          statusFrom: 'OPEN',
          statusTo: 'DONE',
        }),
      ],
      nextCursor: null,
    }));

    expect(await screen.findByText(/Frage zur Anreise/)).toBeTruthy();
    expect(screen.queryByText(/Erledigt/)).toBeNull();
    expect(screen.queryByText(/Offen/)).toBeNull();
  });

  it('tells someone outside the Kernteam that the protocol is not theirs', async () => {
    renderProtocol(() => {
      throw testTrpcError('FORBIDDEN', { reason: 'protocolKernteamOnly', params: {} });
    });

    expect(
      await screen.findByText('Das Protokoll eines Themas sieht nur sein Kernteam.'),
    ).toBeTruthy();
  });
});
