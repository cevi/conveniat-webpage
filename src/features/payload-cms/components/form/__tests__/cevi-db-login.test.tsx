/**
 * @jest-environment jsdom
 */

import { CeviDatabaseLogin } from '@/features/payload-cms/components/form/cevi-db-login';
import { flushPersonalData } from '@/lib/flush-personal-data';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { signOut } from 'next-auth/react';
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

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const methods = useForm();
  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('switching the Cevi.DB login in a form', () => {
  it("drops the previous user's cached data before signing them out", async () => {
    render(
      <TestWrapper>
        <CeviDatabaseLogin name="participant" formId="registration" />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Benutzer wechseln' }));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
    });
    expect(flushPersonalData).toHaveBeenCalled();
  });
});
