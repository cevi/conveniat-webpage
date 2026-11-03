/**
 * @jest-environment jsdom
 */

import { FactList } from '@/features/payload-cms/components/content-blocks/fact-list';
import type { FactListBlock } from '@/features/payload-cms/payload-types';
import { render, screen } from '@testing-library/react';

describe('FactList', () => {
  it('shows the title and every fact with its description', () => {
    render(
      <FactList
        blockType="factList"
        title="Regeln"
        facts={[
          { icon: 'users', title: 'Max. 2 Personen', description: 'pro teilnehmende Person' },
          { icon: 'train', title: 'Anreise nur mit dem ÖV' },
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Regeln' })).toBeInTheDocument();
    expect(screen.getByText('Max. 2 Personen')).toBeInTheDocument();
    expect(screen.getByText('pro teilnehmende Person')).toBeInTheDocument();
    expect(screen.getByText('Anreise nur mit dem ÖV')).toBeInTheDocument();
  });

  it('leaves out a draft fact without a title and renders an unknown icon as info', () => {
    const { container } = render(
      <FactList
        blockType="factList"
        facts={
          [
            { icon: 'gone', title: 'Einlass nur mit Ticket' },
            { icon: 'users', title: '' },
          ] as FactListBlock['facts']
        }
      />,
    );

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('Einlass nur mit Ticket')).toBeInTheDocument();
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelector('svg.lucide-info')).not.toBeNull();
  });

  it('renders nothing without facts', () => {
    const { container } = render(
      <FactList blockType="factList" facts={undefined as unknown as FactListBlock['facts']} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
