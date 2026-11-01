/**
 * @jest-environment jsdom
 */

import { LogoutButton } from '@/features/settings/logout-button';
import { flushPersonalData } from '@/lib/flush-personal-data';
import { assignLocation } from '@/utils/assign-location';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { signOut } from 'next-auth/react';

jest.mock('@/hooks/use-current-locale', () => ({
  useCurrentLocale: (): string => 'de',
}));
jest.mock('next-auth/react', () => ({
  signOut: jest.fn(() => Promise.resolve()),
}));
const mockReleasePushSubscriptions = jest.fn((): Promise<void> => Promise.resolve());
jest.mock('@/hooks/use-release-push-subscriptions', () => ({
  useReleasePushSubscriptions: (): (() => Promise<void>) => mockReleasePushSubscriptions,
}));
jest.mock('@/lib/flush-personal-data', () => ({
  flushPersonalData: jest.fn(),
}));
jest.mock('@/utils/assign-location', () => ({
  assignLocation: jest.fn(),
}));

const setNavigatorOnline = (onLine: boolean): void => {
  Object.defineProperty(navigator, 'onLine', { value: onLine, configurable: true });
};

const renderLogoutButton = (): QueryClient => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(['chat', 'chats'], ['a chat of the signed-in user']);
  render(
    <QueryClientProvider client={queryClient}>
      <LogoutButton />
    </QueryClientProvider>,
  );
  return queryClient;
};

describe('LogoutButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    setNavigatorOnline(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setNavigatorOnline(true);
  });

  it('signs out, drops the cached data and leaves for the start page', async () => {
    const queryClient = renderLogoutButton();

    fireEvent.click(screen.getByRole('button', { name: 'Abmelden' }));

    await waitFor(
      () => {
        expect(assignLocation).toHaveBeenCalledWith('/');
      },
      { timeout: 3000 },
    );
    expect(flushPersonalData).toHaveBeenCalledWith({ clearCachedPages: true });
    expect(queryClient.getQueryData(['chat', 'chats'])).toBeUndefined();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says a logout needs a connection and keeps everything while offline', async () => {
    setNavigatorOnline(false);
    const queryClient = renderLogoutButton();

    fireEvent.click(screen.getByRole('button', { name: 'Abmelden' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Abmelden geht nur mit Verbindung');
    expect(screen.getByRole('button', { name: 'Abmelden' })).toBeEnabled();
    expect(mockReleasePushSubscriptions).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(flushPersonalData).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(['chat', 'chats'])).toEqual(['a chat of the signed-in user']);
    expect(assignLocation).not.toHaveBeenCalled();
  });

  it('says so too when the sign out does not reach the server', async () => {
    jest.mocked(signOut).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    renderLogoutButton();

    fireEvent.click(screen.getByRole('button', { name: 'Abmelden' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Abmelden geht nur mit Verbindung');
    expect(flushPersonalData).not.toHaveBeenCalled();
    expect(assignLocation).not.toHaveBeenCalled();
  });
});
