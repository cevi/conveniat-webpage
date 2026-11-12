/**
 * @jest-environment jsdom
 */
import type { ForumPostDetail } from '@/features/chat/api/forum/forum-queries';
import { ForumPostView } from '@/features/chat/components/forum/forum-post-view';
import { createTestTrpc } from '@/trpc/test-trpc';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const POST_ID = '5b0f3c1e-0000-4000-8000-000000000001';

jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));
jest.mock('@/hooks/use-online-status', () => ({ useOnlineStatus: (): boolean => true }));
jest.mock('@/components/offline-banner', () => ({ OfflineBanner: (): null => null }));
jest.mock('@/components/footer/hide-footer-context', () => ({
  AppFooterController: (): null => null,
}));
// the comments are the chat's thread, tested with the chat; the post stands above them
jest.mock('@/features/chat/components/chat-view/message-list', () => ({
  MessageList: ({ threadHeader }: { threadHeader?: React.ReactNode }): React.ReactNode =>
    threadHeader,
}));
jest.mock('@/features/chat/components/chat-view/chat-client-component', () => ({
  ChatComposerBar: (): null => null,
}));
jest.mock('@/features/chat/components/chat-view/chat-text-area-input', () => ({
  ChatTextAreaInput: (): null => null,
}));
jest.mock('@/features/chat/hooks/use-chat-sse', () => ({ useChatSSE: (): object => ({}) }));
jest.mock('@/features/chat/components/forum/forum-moderation-sheet', () => ({
  ForumModerationSheet: (): null => null,
}));
jest.mock('@/features/chat/components/forum/forum-done-sheet', () => ({
  ForumDoneSheet: (): null => null,
}));
jest.mock('@/features/chat/components/forum/forum-flag-sheet', () => ({
  ForumFlagSheet: ({ messageId }: { messageId: string | undefined }): React.ReactNode =>
    messageId === undefined ? null : <p>Melden: {messageId}</p>,
}));
jest.mock('next/navigation', () => ({
  useRouter: (): object => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: (): URLSearchParams => new URLSearchParams(),
  usePathname: (): string => '/app/forum/5b0f3c1e-0000-4000-8000-000000000001',
}));
jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

type Viewer = ForumPostDetail['viewer'];

const post = (
  overrides: Partial<ForumPostDetail> = {},
  viewer: Partial<Viewer> = {},
): ForumPostDetail => ({
  id: POST_ID,
  topicId: 'topic',
  topicName: 'Platz & Infrastruktur',
  title: 'Telefonliste der Leitenden',
  excerpt: '',
  status: 'OPEN',
  kind: 'QUESTION',
  createdAt: new Date(),
  author: { id: 'author', name: 'Lea' },
  byTopicAdmin: false,
  location: null,
  likeCount: 0,
  likedByMe: false,
  commentCount: 0,
  pinned: false,
  imageCount: 0,
  text: 'Ruft Nina an unter 079 000 00 00',
  images: [],
  answerCommentId: null,
  mergedInto: null,
  mergedPostCount: 0,
  subscribed: false,
  topicSubscribed: false,
  statusHistory: [],
  assignments: [],
  viewer: {
    capacity: null,
    canSetStatus: false,
    canModerate: false,
    canApprove: false,
    isAuthor: false,
    ...viewer,
  },
  ...overrides,
});

const hidden: ForumPostDetail['removal'] = {
  kind: 'HIDDEN',
  reason: 'PERSONAL_DATA',
  note: 'Bitte ohne Telefonnummern',
  byCapacity: 'TOPIC_ADMIN',
  at: new Date(),
  reviewRequested: false,
};

const renderPost = (detail: ForumPostDetail): { calls: { path: string; input: unknown }[] } => {
  const { trpc, queryClient, wrapper, calls } = createTestTrpc({
    'forum.getForumPost': () => detail,
    'chat.user': () => 'viewer',
    'forum.requestForumReview': () => ({ success: true }),
  });
  queryClient.setQueryData(trpc.forum.getForumPost.queryKey({ postId: POST_ID }), detail);
  queryClient.setQueryData(trpc.chat.user.queryKey({}), 'viewer');
  render(<ForumPostView />, { wrapper });
  return { calls };
};

describe('a post hidden by the moderation', () => {
  it('tells its author why, and offers to revise it and to ask for a review', async () => {
    const { calls } = renderPost(post({ removal: hidden }, { isAuthor: true, canEdit: true }));

    expect(screen.getByText('Ausgeblendet, bis du ihn überarbeitest')).toBeTruthy();
    expect(screen.getByText('Grund: Persönliche Daten · Kernteam')).toBeTruthy();
    expect(screen.getByText('«Bitte ohne Telefonnummern»')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Überarbeiten' }));
    expect(await screen.findByRole('dialog', { name: 'Beitrag bearbeiten' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Schliessen' }));

    fireEvent.click(screen.getByRole('button', { name: 'Erneut prüfen lassen' }));
    await waitFor(() =>
      expect(calls).toContainEqual({
        path: 'forum.requestForumReview',
        input: { messageId: POST_ID },
      }),
    );
  });

  it('says that the revision waits for the review, instead of asking a second time', () => {
    renderPost(
      post({ removal: { ...hidden, reviewRequested: true } }, { isAuthor: true, canEdit: true }),
    );

    expect(screen.getByText('Überarbeitet, wartet auf die Prüfung.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Erneut prüfen lassen' })).toBeNull();
  });

  it('tells everyone else only that it was hidden, without the reason', () => {
    // the server keeps the moderator's note to the author and the moderators
    renderPost(post({ removal: { ...hidden, note: null } }));

    expect(screen.getByText('Von der Moderation ausgeblendet.')).toBeTruthy();
    expect(screen.queryByText(/Grund/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Überarbeiten' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Erneut prüfen lassen' })).toBeNull();
  });
});

describe('flagging a post', () => {
  it('offers "Melden" to whoever may flag it, and opens the flag sheet for the post', () => {
    renderPost(post({}, { canFlag: true }));

    fireEvent.click(screen.getByRole('button', { name: 'Melden' }));

    expect(screen.getByText(`Melden: ${POST_ID}`)).toBeTruthy();
  });

  it('offers no "Melden" to someone who may not flag it, like its author', () => {
    renderPost(post({}, { isAuthor: true, canFlag: false }));

    expect(screen.queryByRole('button', { name: 'Melden' })).toBeNull();
  });

  it('says what the user flagged it for instead of offering it twice', () => {
    renderPost(post({}, { canFlag: true, myFlag: 'PERSONAL_DATA' }));

    expect(screen.queryByRole('button', { name: 'Melden' })).toBeNull();
    expect(screen.getByText(/Persönliche Daten/)).toBeTruthy();
  });
});
