/**
 * @jest-environment jsdom
 */
import { FunktionenSyncButton } from '@/features/payload-cms/payload-cms/components/funktionen-sync-button';
import type { FunktionenSyncState } from '@/features/payload-cms/payload-cms/components/funktionen-sync/use-funktionen-sync';
import { render, screen } from '@testing-library/react';
import React from 'react';

let mockPermissions: { update?: boolean } = {};
let mockState: FunktionenSyncState;

jest.mock('@payloadcms/ui', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }): React.ReactElement => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  useAuth: (): unknown => ({ permissions: { collections: { funktionen: mockPermissions } } }),
  useListQuery: (): unknown => ({ query: {}, refineListData: jest.fn() }),
  useLocale: (): unknown => ({ code: 'de' }),
}));
jest.mock(
  '@/features/payload-cms/payload-cms/components/funktionen-sync/use-funktionen-sync',
  () => ({
    useFunktionenSync: (): unknown => ({
      state: mockState,
      isRunning: mockState.phase === 'discovering' || mockState.phase === 'reading',
      start: jest.fn(),
    }),
  }),
);

const IDLE: FunktionenSyncState = {
  phase: 'idle',
  discoveredGroups: 0,
  processedGroups: 0,
  totalGroups: 0,
  found: [],
  result: undefined,
  error: undefined,
};

describe('FunktionenSyncButton', () => {
  it('offers the sync to whoever may edit the functions', () => {
    mockPermissions = { update: true };
    mockState = IDLE;
    render(<FunktionenSyncButton />);
    expect(screen.getByText('Jetzt aus Cevi.DB abgleichen')).toBeInTheDocument();
  });

  it('hides it from everyone else', () => {
    mockPermissions = { update: false };
    mockState = IDLE;
    const { container } = render(<FunktionenSyncButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows how far a running sync has got and the groups it found', () => {
    mockPermissions = { update: true };
    mockState = {
      ...IDLE,
      phase: 'reading',
      processedGroups: 3,
      totalGroups: 12,
      found: [{ groupId: '4087', groupName: 'Ressort Infrastruktur', leaders: 2 }],
    };
    render(<FunktionenSyncButton />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByText('3/12 Gruppen')).toBeInTheDocument();
    expect(screen.getByText('Ressort Infrastruktur')).toBeInTheDocument();
    expect(screen.getByText('2 Leitende')).toBeInTheDocument();
  });

  it('reports what a finished sync changed', () => {
    mockPermissions = { update: true };
    mockState = {
      ...IDLE,
      phase: 'done',
      processedGroups: 12,
      totalGroups: 12,
      result: { groups: 12, created: 2, updated: 1, removed: 0, usersWritten: 3 },
    };
    render(<FunktionenSyncButton />);
    expect(
      screen.getByText('2 neu, 1 aktualisiert, 0 entfernt; 3 Personen nachgeführt.'),
    ).toBeInTheDocument();
  });
});
