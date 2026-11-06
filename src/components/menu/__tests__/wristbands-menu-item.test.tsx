/**
 * @jest-environment jsdom
 */

import { WristbandsMenuItem } from '@/components/menu/wristbands-menu-item';
import type { TestTrpc } from '@/trpc/test-trpc';
import { createTestTrpc } from '@/trpc/test-trpc';
import { render, screen, waitFor } from '@testing-library/react';

let mockStatus: string;

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { NEXT_PUBLIC_APP_HOST_URL: 'https://conveniat27.ch' },
}));
jest.mock('@/hooks/use-auth-status', () => ({ useAuthStatus: (): string => mockStatus }));
jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

/** renders the item with the server answering `access` for the user's wristbands */
const renderItem = (access: unknown, enabled = true): TestTrpc => {
  const testTrpc = createTestTrpc({ 'wristband.getWristbandAccess': () => access });
  render(<WristbandsMenuItem variant="drawer" locale="de" enabled={enabled} />, {
    wrapper: testTrpc.wrapper,
  });
  return testTrpc;
};

/** waits until the answer of the server is in the cache, so the item has read it */
const waitForAnswer = async ({ trpc, queryClient }: TestTrpc): Promise<void> => {
  await waitFor(() =>
    expect(queryClient.getQueryData(trpc.wristband.getWristbandAccess.queryKey())).toBeDefined(),
  );
};

beforeEach(() => {
  mockStatus = 'authenticated';
});

describe('the wristbands in the menu', () => {
  it('is hidden from a participant who neither programs nor reads bands', async () => {
    const testTrpc = renderItem({ hoefe: 0, reader: false });
    await waitForAnswer(testTrpc);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it.each([
    ['the AVP of a Hof', { hoefe: 1, reader: false }],
    ['security and first aid', { hoefe: 0, reader: true }],
  ])('leads %s to the wristbands', async (_who, access) => {
    renderItem(access);
    expect(await screen.findByRole('link', { name: 'Armbänder' })).toHaveAttribute(
      'href',
      '/app/wristbands',
    );
  });

  it('does not ask for a guest, whose request would sign the app out', () => {
    mockStatus = 'unauthenticated';
    const { calls } = renderItem({ hoefe: 1, reader: true });
    expect(calls).toEqual([]);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows nothing where the deployment has no wristbands', () => {
    const { calls } = renderItem({ hoefe: 1, reader: true }, false);
    expect(calls).toEqual([]);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('reads a cached answer of another shape as no access', async () => {
    const testTrpc = renderItem({ hoefe: '3', reader: 'yes' });
    await waitForAnswer(testTrpc);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
