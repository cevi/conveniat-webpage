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

  it('says the band number in bytes, without anything to unfold', () => {
    const { container } = render(<BandIdentityCard identity={LEA} locale="de" />);
    expect(screen.getByText('Band 04 62 41 5A 7E 24 90')).toBeInTheDocument();
    expect(container.querySelector('details')).toBeNull();
  });

  it('locks the Hof and the Quartier of a band known by its number alone, until it is read again', () => {
    render(
      <BandIdentityCard
        identity={{ ...LEA, hof: '', quartier: null, verified: false }}
        locale="de"
        unlock={<button type="button">Nochmals ans Handy halten</button>}
      />,
    );
    // greyed rows, which a screen reader reads as locked
    expect(screen.getByText('Hof')).toHaveTextContent('Hof: erst nach nochmaligem Scannen');
    expect(screen.getByText('Quartier')).toHaveTextContent(
      'Quartier: erst nach nochmaligem Scannen',
    );
    expect(screen.getByRole('button', { name: 'Nochmals ans Handy halten' })).toBeInTheDocument();
    expect(screen.queryByText('Echtheit nicht geprüft')).not.toBeInTheDocument();
  });

  it('says when the list on the phone answered, and when a band gave no signature', () => {
    render(
      <BandIdentityCard
        identity={{ ...LEA, verified: false }}
        fromRoster={{ updatedAt: Date.UTC(2027, 6, 25, 8, 30) }}
        locale="de"
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
