/**
 * @jest-environment jsdom
 */

import WristbandsLayout from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/wristbands/layout';
import { act, render, screen } from '@testing-library/react';

let mockSession: unknown;
const signIn = jest.fn();

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { FEATURE_ENABLE_NFC_WRISTBANDS: true },
}));
jest.mock('next/cache', () => ({ io: (): Promise<void> => Promise.resolve() }));
jest.mock('next/navigation', () => ({
  notFound: (): never => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
jest.mock('@/utils/auth', () => ({ auth: (): Promise<unknown> => Promise.resolve(mockSession) }));
jest.mock('@/utils/auth-helpers', () => ({
  isValidNextAuthUser: (user: unknown): boolean => user !== undefined,
}));
jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));
jest.mock('next-auth/react', () => ({
  signIn: (...arguments_: unknown[]): unknown => signIn(...arguments_),
}));

const renderLayout = async (): Promise<void> => {
  await act(async () => {
    render(
      <WristbandsLayout>
        <button type="button">Band programmieren</button>
      </WristbandsLayout>,
    );
    await Promise.resolve();
  });
};

describe('the wristband pages', () => {
  it('offer a guest only the login', async () => {
    mockSession = null;
    await renderLayout();
    expect(await screen.findByRole('button', { name: 'Anmelden mit Cevi.DB' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Band programmieren' })).not.toBeInTheDocument();
  });

  it('open for someone signed in', async () => {
    mockSession = { user: { uuid: 'flurin' } };
    await renderLayout();
    expect(await screen.findByRole('button', { name: 'Band programmieren' })).toBeInTheDocument();
  });
});
