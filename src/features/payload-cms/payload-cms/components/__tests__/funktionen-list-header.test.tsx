/**
 * @jest-environment jsdom
 */
import { FunktionenListHeader } from '@/features/payload-cms/payload-cms/components/funktionen-list-header';
import { render, screen } from '@testing-library/react';
import React from 'react';

let mockPermissions: { update?: boolean } = {};

jest.mock('@payloadcms/ui', () => ({
  Banner: ({ children }: { children: React.ReactNode }): React.ReactElement => (
    <div>{children}</div>
  ),
  useAuth: (): unknown => ({ permissions: { collections: { funktionen: mockPermissions } } }),
  useLocale: (): unknown => ({ code: 'de' }),
}));
jest.mock('@/features/payload-cms/payload-cms/components/funktionen-sync-button', () => ({
  FunktionenSyncButton: (): React.ReactElement => <button type="button">Sync</button>,
}));
jest.mock(
  '@/features/payload-cms/payload-cms/components/funktionen-sync/seed-profile-pictures-button',
  () => ({
    SeedProfilePicturesButton: (): React.ReactElement => (
      <button type="button">Profilbilder</button>
    ),
  }),
);

describe('FunktionenListHeader', () => {
  it('explains the address book and offers the Cevi.DB actions to whoever may edit', () => {
    mockPermissions = { update: true };
    render(<FunktionenListHeader />);
    expect(screen.getByText('Wer im Adressbuch der App steht')).toBeInTheDocument();
    expect(screen.getByText('Die AVP jedes Hofs: bei allen.')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('explains the address book without the actions to everyone else', () => {
    mockPermissions = { update: false };
    render(<FunktionenListHeader />);
    expect(screen.getByText('Wer im Adressbuch der App steht')).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
