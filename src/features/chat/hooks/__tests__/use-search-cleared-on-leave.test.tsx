/**
 * @jest-environment jsdom
 */

import { useSearchClearedOnLeave } from '@/features/chat/hooks/use-search-cleared-on-leave';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { Activity, useState } from 'react';

const Search: React.FC = () => {
  const [query, setQuery] = useSearchClearedOnLeave();
  return (
    <input aria-label="search" value={query} onChange={(event) => setQuery(event.target.value)} />
  );
};

/** A route the way Next.js keeps it after the user left it: mounted, hidden in an Activity. */
const Route: React.FC = () => {
  const [isHidden, setIsHidden] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsHidden((hidden) => !hidden)}>
        toggle
      </button>
      <Activity mode={isHidden ? 'hidden' : 'visible'}>
        <Search />
      </Activity>
    </>
  );
};

const searchField = (): HTMLInputElement =>
  screen.getByLabelText<HTMLInputElement>('search', { selector: 'input' });

describe('useSearchClearedOnLeave', () => {
  it('keeps the query while the screen is shown', () => {
    render(<Route />);
    fireEvent.change(searchField(), { target: { value: 'Flur' } });
    expect(searchField().value).toBe('Flur');
  });

  it('is empty again when the user comes back to the screen', () => {
    render(<Route />);
    fireEvent.change(searchField(), { target: { value: 'Flur' } });
    fireEvent.click(screen.getByText('toggle'));
    fireEvent.click(screen.getByText('toggle'));
    expect(searchField().value).toBe('');
  });
});
