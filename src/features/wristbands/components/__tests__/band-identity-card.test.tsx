/**
 * @jest-environment jsdom
 */

import { BandIdentityCard } from '@/features/wristbands/components/band-identity-card';
import { render, screen } from '@testing-library/react';

const LEA = {
  state: 'assigned',
  uid: '0462415A7E2490',
  fullName: 'Lea Meier',
  nickname: 'Fuchs',
  hof: 'Cevi Uster',
  quartier: 'Quartier 5 - Greif',
  verified: true,
} as const;

describe('a band as security and first aid read it', () => {
  it('names the wearer, the Hof and the Quartier', () => {
    render(<BandIdentityCard identity={LEA} locale="de" />);
    expect(screen.getByRole('heading', { name: 'Lea Meier' })).toBeInTheDocument();
    expect(screen.getByText('v/o Fuchs')).toBeInTheDocument();
    expect(screen.getByText('Cevi Uster')).toBeInTheDocument();
    expect(screen.getByText('Quartier 5 - Greif')).toBeInTheDocument();
  });

  it('keeps the UID folded away under Details, in bytes', () => {
    const { container } = render(<BandIdentityCard identity={LEA} locale="de" />);
    const details = container.querySelector('details');
    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);
    expect(details).toHaveTextContent('Band 04 62 41 5A 7E 24 90');
  });

  it('says when the list on the phone answered, and when a band was not checked', () => {
    render(
      <BandIdentityCard
        identity={{ ...LEA, verified: false }}
        fromRoster={{ updatedAt: Date.UTC(2027, 6, 25, 8, 30) }}
        locale="de"
        coldTap
      />,
    );
    expect(screen.getByText('Echtheit nicht geprüft')).toBeInTheDocument();
    // the camp's time, 10:30 in Zurich
    expect(
      screen.getByText(/Aus der Liste auf dem Handy, Stand 25\.7\., 10:30/),
    ).toBeInTheDocument();
  });

  it('marks a copy in the danger colours', () => {
    render(<BandIdentityCard identity={{ state: 'not-genuine', uid: LEA.uid }} locale="de" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Kein echtes conveniat27-Armband');
  });
});
