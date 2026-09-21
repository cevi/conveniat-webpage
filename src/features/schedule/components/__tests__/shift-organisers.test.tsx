/**
 * @jest-environment jsdom
 */

import type { HelperShiftOrganiser } from '@/features/schedule/api/get-helper-shifts';
import { ShiftOrganisers } from '@/features/schedule/components/shift-organisers';
import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: (): { push: jest.Mock } => ({ push: jest.fn() }),
}));

const anna: HelperShiftOrganiser = {
  id: 'org-1',
  fullName: 'Anna Muster',
  email: 'anna@example.org',
};

describe('ShiftOrganisers', () => {
  it('lists every organiser as a contact', () => {
    render(<ShiftOrganisers organisers={[anna]} locale="de" />);

    expect(screen.getByText('Organisatoren kontaktieren')).toBeInTheDocument();
    expect(screen.getByText('Anna Muster')).toBeInTheDocument();
    // the address is deliberately not rendered: the chat button is how an organiser is reached
    expect(screen.queryByText('anna@example.org')).toBeNull();
  });

  /**
   * Helpers know each other by Ceviname, so the contact row spells it out the way the chat
   * contact list does - "Vorname Nachname v/o Ceviname" - rather than by the civil name alone.
   */
  it('spells out the Ceviname of an organiser who has one', () => {
    render(<ShiftOrganisers organisers={[{ ...anna, nickname: 'Ameise' }]} locale="de" />);

    expect(screen.getByText('Anna Muster v/o Ameise')).toBeInTheDocument();
  });

  /**
   * A shift restored from the persisted query cache was written before `nickname` existed, so
   * the field is simply absent there - the row must still render the plain name.
   */
  it('falls back to the plain name when no Ceviname is set', () => {
    render(<ShiftOrganisers organisers={[anna]} locale="de" />);

    expect(screen.getByText('Anna Muster')).toBeInTheDocument();
  });

  it('renders nothing for a shift without organisers', () => {
    const { container } = render(<ShiftOrganisers organisers={[]} locale="de" />);

    expect(container).toBeEmptyDOMElement();
  });

  /**
   * The shift comes out of the persisted React Query cache, which can have been written by a
   * build that predates the `organiser` field - reading `.length` off it threw and took the
   * whole helper portal down to the error boundary until the entry aged out.
   */
  it('renders nothing when the field is absent from a payload written by an older build', () => {
    const { container } = render(<ShiftOrganisers organisers={undefined} locale="de" />);

    expect(container).toBeEmptyDOMElement();
  });
});
