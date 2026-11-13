/**
 * @jest-environment jsdom
 */
import type { ChatMessage } from '@/features/chat/api/types';
import { ForumCommentFlags } from '@/features/chat/components/forum/forum-comment-flags';
import { MessageEventType } from '@/lib/prisma/enums';
import { createTestTrpc } from '@/trpc/test-trpc';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/hooks/use-online-status', () => ({ useOnlineStatus: (): boolean => true }));
jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

const comment = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'comment-1',
  createdAt: new Date('2027-07-25T10:00:00Z'),
  messagePayload: { text: 'Wer da so baut, ist selber schuld' },
  senderId: 'jonas',
  status: MessageEventType.STORED,
  type: 'TEXT_MSG',
  parentId: 'post-1',
  replyCount: 0,
  hasUnreadReplies: false,
  reactions: [],
  forumFlags: {
    count: 2,
    reasons: [
      { reason: 'INAPPROPRIATE', note: 'geht gar nicht' },
      { reason: 'INAPPROPRIATE', note: null },
    ],
  },
  ...overrides,
});

const renderFlags = (
  message: ChatMessage,
): { calls: { path: string; input: unknown }[]; onHide: jest.Mock } => {
  const onHide = jest.fn();
  const { wrapper, calls } = createTestTrpc({
    'forum.dismissForumFlags': () => ({ dismissed: 2 }),
    'forum.restoreForumMessage': () => ({ restored: true }),
  });
  render(<ForumCommentFlags message={message} locale="de" onHide={onHide} />, { wrapper });
  return { calls, onHide };
};

describe('a flagged comment, for its moderators', () => {
  it('says why it was flagged and keeps it on request', async () => {
    const { calls, onHide } = renderFlags(comment());

    expect(screen.getByText('Gemeldet · Unangemessen oder gefährlich · 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Meldungen ansehen' }));
    expect(screen.getByText(/«geht gar nicht»/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Behalten' }));
    await waitFor(() =>
      expect(calls).toContainEqual({
        path: 'forum.dismissForumFlags',
        input: { messageId: 'comment-1' },
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ausblenden' }));
    expect(onHide).toHaveBeenCalled();
  });

  it('approves one the flags hid on their own, or leaves it hidden', async () => {
    const { calls } = renderFlags(
      comment({
        forumRemoval: {
          kind: 'HIDDEN',
          reason: 'INAPPROPRIATE',
          note: null,
          byCapacity: null,
          at: new Date('2027-07-25T10:05:00Z'),
          reviewRequested: false,
        },
      }),
    );

    expect(screen.getByRole('button', { name: 'Ausgeblendet lassen' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Freigeben' }));
    await waitFor(() =>
      expect(calls).toContainEqual({
        path: 'forum.restoreForumMessage',
        input: { messageId: 'comment-1' },
      }),
    );
  });

  it('shows nothing for a comment without open flags', () => {
    renderFlags(comment({ forumFlags: undefined }));
    expect(screen.queryByRole('button')).toBeNull();
  });
});
