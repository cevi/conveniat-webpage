/**
 * @jest-environment jsdom
 */

import NewChatWithUserPage from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/chat/new-chat-with-user/[token]/page';
import { render, screen } from '@testing-library/react';

const redeemChatInvite = jest.fn<Promise<unknown>, [unknown]>();
const redirect = jest.fn<void, [string]>();

jest.mock('@/trpc/server', () => ({
  trpc: {
    chat: { redeemChatInvite: (input: unknown): Promise<unknown> => redeemChatInvite(input) },
  },
}));
jest.mock('@/utils/auth', () => ({
  auth: (): Promise<unknown> => Promise.resolve({ user: { uuid: 'flurin' } }),
}));
jest.mock('@/utils/auth-helpers', () => ({ isValidNextAuthUser: (): boolean => true }));
jest.mock('@/utils/get-route-locale', () => ({
  getRouteLocale: (): Promise<string> => Promise.resolve('de'),
}));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({ error: jest.fn(), debug: jest.fn() }),
}));
jest.mock('next/navigation', () => ({
  redirect: (url: string): void => {
    redirect(url);
  },
}));

const renderPage = async (): Promise<void> => {
  render(await NewChatWithUserPage({ params: Promise.resolve({ token: 'code' }) }));
};

describe('NewChatWithUserPage', () => {
  beforeEach(() => {
    redeemChatInvite.mockReset();
    redirect.mockReset();
  });

  it('says so when the user scanned their own code, instead of returning to the chats', async () => {
    redeemChatInvite.mockResolvedValue({ status: 'ownInvite' });
    await renderPage();

    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByText('Das ist dein eigener QR-Code.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Zurück zu Chats' })).toHaveAttribute(
      'href',
      '/app/chat',
    );
  });

  it('opens the chat a scanned code leads to', async () => {
    redeemChatInvite.mockResolvedValue({ status: 'redeemed', chatId: 'chat-1' });
    redirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });

    await expect(renderPage()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/app/chat/chat-1');
  });
});
