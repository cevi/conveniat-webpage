/**
 * @jest-environment jsdom
 */

import { WristbandsMenuItem } from '@/components/menu/wristbands-menu-item';
import { render, screen } from '@testing-library/react';

let mockStatus: string;
let mockAccess: unknown;
const mockUseQuery = jest.fn((_input: unknown, options: { enabled: boolean }) => ({
  data: options.enabled ? mockAccess : undefined,
}));

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { NEXT_PUBLIC_APP_HOST_URL: 'https://conveniat27.ch' },
}));
jest.mock('@/hooks/use-auth-status', () => ({ useAuthStatus: (): string => mockStatus }));
jest.mock('@/trpc/client', () => ({
  trpc: {
    wristband: {
      getWristbandAccess: {
        useQuery: (input: unknown, options: { enabled: boolean }): unknown =>
          mockUseQuery(input, options),
      },
    },
  },
}));

const renderItem = (enabled = true): void => {
  render(<WristbandsMenuItem variant="drawer" locale="de" enabled={enabled} />);
};

beforeEach(() => {
  mockStatus = 'authenticated';
  mockAccess = { hoefe: 0, reader: false };
  mockUseQuery.mockClear();
});

describe('the wristbands in the menu', () => {
  it('is hidden from a participant who neither programs nor reads bands', () => {
    renderItem();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it.each([
    ['the AVP of a Hof', { hoefe: 1, reader: false }],
    ['security and first aid', { hoefe: 0, reader: true }],
  ])('leads %s to the wristbands', (_who, access) => {
    mockAccess = access;
    renderItem();
    expect(screen.getByRole('link', { name: 'Armbänder' })).toHaveAttribute(
      'href',
      '/app/wristbands',
    );
  });

  it('does not ask for a guest, whose request would sign the app out', () => {
    mockStatus = 'unauthenticated';
    mockAccess = { hoefe: 1, reader: true };
    renderItem();
    expect(mockUseQuery).toHaveBeenCalledWith(undefined, { enabled: false });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows nothing where the deployment has no wristbands', () => {
    mockAccess = { hoefe: 1, reader: true };
    renderItem(false);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('reads a cached answer of another shape as no access', () => {
    mockAccess = { hoefe: '3', reader: 'yes' };
    renderItem();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
