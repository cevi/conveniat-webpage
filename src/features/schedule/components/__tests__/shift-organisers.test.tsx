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
    expect(screen.getByText('anna@example.org')).toBeInTheDocument();
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
