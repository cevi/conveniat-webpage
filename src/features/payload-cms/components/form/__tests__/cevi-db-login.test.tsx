/**
 * @jest-environment jsdom
 */

import { CeviDatabaseLogin } from '@/features/payload-cms/components/form/cevi-db-login';
import { flushPersonalData } from '@/lib/flush-personal-data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { signIn, signOut } from 'next-auth/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';

jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));
jest.mock('next-i18n-router/client', () => ({
  useCurrentLocale: (): string => 'de',
}));
jest.mock('next-auth/react', () => ({
  useSession: (): object => ({
    data: { user: { name: 'Lena Muster', email: 'lena@example.ch', uuid: 'user-a' } },
  }),
  signIn: jest.fn(() => Promise.resolve()),
  signOut: jest.fn(() => Promise.resolve()),
}));
const mockReleasePushSubscriptions = (): Promise<void> => Promise.resolve();
jest.mock('@/hooks/use-release-push-subscriptions', () => ({
  useReleasePushSubscriptions: (): (() => Promise<void>) => mockReleasePushSubscriptions,
}));
jest.mock('@/components/ui/typography/subheading-h3', () => ({
  SubheadingH3: 'h3',
}));
jest.mock('@/lib/flush-personal-data', () => ({
  flushPersonalData: jest.fn(),
}));

const FormWithCache: React.FC<{ children: React.ReactNode; queryClient: QueryClient }> = ({
  children,
  queryClient,
}) => {
  const methods = useForm();
  return (
    <QueryClientProvider client={queryClient}>
      <FormProvider {...methods}>{children}</FormProvider>
    </QueryClientProvider>
  );
};

/** Renders the login field for a signed-in user whose chats are in the query cache. */
const renderSignedIn = (): QueryClient => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(['chat', 'chats'], ['a chat of the previous user']);
  render(
    <FormWithCache queryClient={queryClient}>
      <CeviDatabaseLogin name="participant" formId="registration" />
    </FormWithCache>,
  );
  return queryClient;
};

describe('switching the Cevi.DB login in a form', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("drops the previous user's cached data once they are signed out", async () => {
    const queryClient = renderSignedIn();

    fireEvent.click(screen.getByRole('button', { name: 'Benutzer wechseln' }));

    await waitFor(
      () => {
        expect(signIn).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
    expect(flushPersonalData).toHaveBeenCalledWith({ clearCachedPages: true });
    // the persister would otherwise write the in-memory cache straight back to IndexedDB
    expect(queryClient.getQueryData(['chat', 'chats'])).toBeUndefined();
  });

  it('keeps the data of a user who could not be signed out, for example offline', async () => {
    jest.mocked(signOut).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const queryClient = renderSignedIn();

    fireEvent.click(screen.getByRole('button', { name: 'Benutzer wechseln' }));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
    });
    expect(flushPersonalData).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(['chat', 'chats'])).toEqual(['a chat of the previous user']);
  });
});
