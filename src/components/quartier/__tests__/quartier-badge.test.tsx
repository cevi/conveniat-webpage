/**
 * @jest-environment jsdom
 */

import { QuartierBadge, QuartierGroupBadge } from '@/components/quartier/quartier-badge';
import { render, screen } from '@testing-library/react';

describe('QuartierBadge', () => {
  it('shows a numbered Quartier as its house icon and "Q5", the icon hidden from screen readers', () => {
    const { container } = render(
      <QuartierBadge quartier={{ name: 'Quartier 5 - Greif', number: 5, rufname: 'Greif' }} />,
    );

    expect(screen.getByText('Q5')).toBeInTheDocument();
    const icon = container.querySelector('svg');
    expect(icon).not.toBeNull();
    expect(icon?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('keeps the text chip with the full name for a Quartier from an older copy', () => {
    const { container } = render(<QuartierBadge quartier={{ name: 'Quartier 5 - Greif' }} />);

    expect(screen.getByText('Quartier 5 - Greif')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('has no icon for a number the camp has no house for', () => {
    const { container } = render(<QuartierBadge quartier={{ name: 'Familienlager', number: 9 }} />);

    expect(screen.getByText('Q9')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });
});

const q = (
  number: number,
  rufname: string,
): { id: string; name: string; number: number; rufname: string } => ({
  id: `q${number}`,
  name: `Quartier ${number} - ${rufname}`,
  number,
  rufname,
});

describe('QuartierGroupBadge', () => {
  it('shows the Quartiere of a slot as their icons and one range, on one chip', () => {
    const { container } = render(
      <QuartierGroupBadge
        quartiere={[q(4, 'Kitsune'), q(5, 'Greif'), q(6, 'Cerberus')]}
        myQuartierIds={new Set()}
      />,
    );

    expect(screen.getByText('Q4–Q6')).toBeInTheDocument();
    expect(container.querySelectorAll('svg')).toHaveLength(3);
  });

  it('is a plain chip for a single Quartier', () => {
    render(<QuartierGroupBadge quartiere={[q(7, 'Phoenix')]} myQuartierIds={new Set()} />);

    expect(screen.getByText('Q7')).toBeInTheDocument();
  });
});
