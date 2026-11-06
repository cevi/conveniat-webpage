/**
 * @jest-environment jsdom
 */

import { DashboardQuickAccess } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-quick-access';
import { render, screen } from '@testing-library/react';

let mockAccess: unknown;

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
jest.mock('@/trpc/client', () => ({
  trpc: {
    wristband: {
      getWristbandAccess: {
        useQuery: (_input: unknown, options: { enabled: boolean }): unknown => ({
          data: options.enabled ? mockAccess : undefined,
        }),
      },
    },
  },
}));

const renderTiles = (wristbandsEnabled = true): void => {
  render(
    <DashboardQuickAccess
      locale="de"
      supportEmail="support@example.test"
      flags={{
        imageUploadEnabled: false,
        materialEnabled: false,
        helperShiftsEnabled: false,
        photoContestEnabled: false,
        wristbandsEnabled,
      }}
    />,
  );
};

const wristbandsTile = (): HTMLElement | null => screen.queryByRole('link', { name: /Armbänder/ });

describe('the wristbands on Home', () => {
  it('are hidden from a participant who neither programs nor reads bands', () => {
    mockAccess = { hoefe: 0, reader: false };
    renderTiles();
    expect(wristbandsTile()).not.toBeInTheDocument();
  });

  it('lead an AVP to the wristbands', () => {
    mockAccess = { hoefe: 2, reader: false };
    renderTiles();
    expect(wristbandsTile()).toHaveAttribute('href', '/app/wristbands');
  });

  it('lead security and first aid to the wristbands', () => {
    mockAccess = { hoefe: 0, reader: true };
    renderTiles();
    expect(wristbandsTile()).toHaveAttribute('href', '/app/wristbands');
  });

  // the tile is as tall as the others; a line under the title only arrived with the access query
  it('carry only their title', () => {
    mockAccess = { hoefe: 1, reader: true };
    renderTiles();
    expect(wristbandsTile()).toHaveTextContent(/^Armbänder$/);
  });

  it('are not there where the deployment has no wristbands', () => {
    mockAccess = { hoefe: 1, reader: true };
    renderTiles(false);
    expect(wristbandsTile()).not.toBeInTheDocument();
  });
});
