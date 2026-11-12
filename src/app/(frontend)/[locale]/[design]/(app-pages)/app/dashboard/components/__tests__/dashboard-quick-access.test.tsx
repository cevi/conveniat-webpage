/**
 * @jest-environment jsdom
 */

import { DashboardQuickAccess } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-quick-access';
import type { TestTrpc } from '@/trpc/test-trpc';
import { createTestTrpc } from '@/trpc/test-trpc';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  useSession: (): unknown => ({
    status: 'authenticated',
    data: {
      user: { uuid: 'lea', group_ids: [], email: 'lea@example.test', name: 'Lea Meier' },
    },
  }),
}));
jest.mock('@/hooks/use-auth-status', () => ({ useAuthStatus: (): string => 'authenticated' }));
jest.mock('@/features/settings/utils/support-mail', () => ({
  supportMailLink: (): string => 'mailto:support@example.test',
}));
// the user has not chosen, so Home shows the default tiles; the editor is not opened here
jest.mock(
  '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/hooks/use-chosen-quick-access',
  () => ({
    useChosenQuickAccess: (): unknown => ({
      chosen: ['upload', 'qr', 'material', 'wristbands', 'support'],
      isLoading: false,
      isCustomized: false,
      saveFailed: false,
      setChosen: jest.fn(),
    }),
  }),
);
jest.mock(
  '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/quick-access-editor',
  () => ({ QuickAccessEditor: (): null => null }),
);
jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

/** renders Home's tiles with the server answering `access` for the user's wristbands */
const renderTiles = (access: unknown, wristbandsEnabled = true): TestTrpc => {
  const testTrpc = createTestTrpc({ 'wristband.getWristbandAccess': () => access });
  render(
    <DashboardQuickAccess
      locale="de"
      supportEmail="support@example.test"
      defaultTiles={['upload', 'qr', 'material', 'wristbands', 'support']}
      flags={{
        imageUploadEnabled: false,
        materialEnabled: false,
        helperShiftsEnabled: false,
        photoContestEnabled: false,
        wristbandsEnabled,
        storyEnabled: false,
      }}
    />,
    { wrapper: testTrpc.wrapper },
  );
  return testTrpc;
};

const wristbandsTile = (): HTMLElement | null => screen.queryByRole('link', { name: /Armbänder/ });
const findWristbandsTile = (): Promise<HTMLElement> =>
  screen.findByRole('link', { name: /Armbänder/ });

/** waits until the answer of the server is in the cache, so the tiles have read it */
const waitForAnswer = async ({ trpc, queryClient }: TestTrpc): Promise<void> => {
  await waitFor(() =>
    expect(queryClient.getQueryData(trpc.wristband.getWristbandAccess.queryKey())).toBeDefined(),
  );
};

describe('the wristbands on Home', () => {
  it('are hidden from a participant who neither programs nor reads bands', async () => {
    await waitForAnswer(renderTiles({ hoefe: 0, reader: false }));
    expect(wristbandsTile()).not.toBeInTheDocument();
  });

  it('lead an AVP to the wristbands', async () => {
    renderTiles({ hoefe: 2, reader: false });
    expect(await findWristbandsTile()).toHaveAttribute('href', '/app/wristbands');
  });

  it('lead security and first aid to the wristbands', async () => {
    renderTiles({ hoefe: 0, reader: true });
    expect(await findWristbandsTile()).toHaveAttribute('href', '/app/wristbands');
  });

  // the tile is as tall as the others; a line under the title only arrived with the access query
  it('carry only their title', async () => {
    renderTiles({ hoefe: 1, reader: true });
    expect(await findWristbandsTile()).toHaveTextContent(/^Armbänder$/);
  });

  it('are not there where the deployment has no wristbands', () => {
    const { calls } = renderTiles({ hoefe: 1, reader: true }, false);
    expect(calls).toEqual([]);
    expect(wristbandsTile()).not.toBeInTheDocument();
  });
});
