/**
 * @jest-environment jsdom
 */

import type { HelperShiftOrganiser } from '@/features/schedule/api/get-helper-shifts';
import { OrganiserContacts } from '@/features/schedule/components/organiser-contacts';
import { createTestTrpc } from '@/trpc/test-trpc';
import { render as renderWithoutTrpc, screen } from '@testing-library/react';
import type React from 'react';

// The organiser rows carry a chat button that creates the chat through tRPC.
jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);
jest.mock('@/hooks/use-current-locale', () => ({
  useCurrentLocale: (): string => 'de',
}));

jest.mock('next/navigation', () => ({
  useRouter: (): { push: jest.Mock } => ({ push: jest.fn() }),
}));

/** no handler: none of these tests presses the chat button, so a call would fail the test */
const render = (ui: React.ReactElement): ReturnType<typeof renderWithoutTrpc> =>
  renderWithoutTrpc(ui, { wrapper: createTestTrpc().wrapper });

const anna: HelperShiftOrganiser = {
  id: 'org-1',
  fullName: 'Anna Muster',
};

describe('OrganiserContacts', () => {
  it('lists every organiser as a contact', () => {
    render(<OrganiserContacts organisers={[anna]} locale="de" />);

    expect(screen.getByText('Organisatoren kontaktieren')).toBeInTheDocument();
    expect(screen.getByText('Anna Muster')).toBeInTheDocument();
  });

  /**
   * Helpers know each other by Ceviname, so the contact row spells it out the way the chat
   * contact list does - "Vorname Nachname v/o Ceviname" - rather than by the civil name alone.
   */
  it('spells out the Ceviname of an organiser who has one', () => {
    render(<OrganiserContacts organisers={[{ ...anna, nickname: 'Ameise' }]} locale="de" />);

    expect(screen.getByText('Anna Muster v/o Ameise')).toBeInTheDocument();
  });

  /**
   * A shift restored from the persisted query cache was written before `nickname` existed, so
   * the field is simply absent there - the row must still render the plain name.
   */
  it('falls back to the plain name when no Ceviname is set', () => {
    render(<OrganiserContacts organisers={[anna]} locale="de" />);

    expect(screen.getByText('Anna Muster')).toBeInTheDocument();
  });

  it('renders nothing for a shift without organisers', () => {
    const { container } = render(<OrganiserContacts organisers={[]} locale="de" />);

    expect(container).toBeEmptyDOMElement();
  });

  /**
   * The shift comes out of the persisted React Query cache, which can have been written by a
   * build that predates the `organiser` field - reading `.length` off it threw and took the
   * whole helper portal down to the error boundary until the entry aged out.
   */
  it('renders nothing when the field is absent from a payload written by an older build', () => {
    const { container } = render(<OrganiserContacts organisers={undefined} locale="de" />);

    expect(container).toBeEmptyDOMElement();
  });
});
