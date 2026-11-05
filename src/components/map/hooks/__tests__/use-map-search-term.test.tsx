/**
 * @jest-environment jsdom
 */

import { useMapSearchTerm } from '@/components/map/hooks/use-map-search-term';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { Activity } from 'react';

const SearchField: React.FC = () => {
  const [searchTerm, setSearchTerm] = useMapSearchTerm();
  return (
    <input
      aria-label="search"
      value={searchTerm}
      onChange={(event) => setSearchTerm(event.target.value)}
    />
  );
};

const MapPage: React.FC<{ mode: 'visible' | 'hidden' }> = ({ mode }) => (
  <Activity mode={mode}>
    <SearchField />
  </Activity>
);

describe('useMapSearchTerm', () => {
  it('forgets the search once the page has been left, as Next.js hides it in an Activity', () => {
    const { rerender } = render(<MapPage mode="visible" />);
    fireEvent.change(screen.getByLabelText('search'), { target: { value: 'Sanität' } });
    expect(screen.getByLabelText('search')).toHaveValue('Sanität');

    rerender(<MapPage mode="hidden" />);
    rerender(<MapPage mode="visible" />);

    expect(screen.getByLabelText('search')).toHaveValue('');
  });
});
