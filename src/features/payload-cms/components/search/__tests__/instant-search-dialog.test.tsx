/**
 * @jest-environment jsdom
 */

import { InstantSearchDialog } from '@/features/payload-cms/components/search/instant-search-dialog';
import { useSearchShortcut } from '@/features/payload-cms/components/search/use-search-shortcut';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { useCallback, useState } from 'react';

jest.mock('next/navigation', () => ({
  useRouter: (): { push: jest.Mock } => ({ push: jest.fn() }),
}));

// the preview links read the server environment; no result is ever shown here
jest.mock('@/features/payload-cms/components/search/search-preview', () => ({
  SearchPreview: (): undefined => undefined,
}));

jest.mock('@/hooks/use-current-locale', () => ({
  useCurrentLocale: (): string => 'de',
}));

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: (): boolean => true,
}));

jest.mock('@/trpc/client', () => ({
  trpc: {
    search: {
      getSearchResultList: {
        useQuery: (): { data: undefined; isError: boolean } => ({
          data: undefined,
          isError: false,
        }),
      },
    },
  },
}));

/** The dialog next to the page-wide shortcut, the way the desktop nav mounts them. */
const SearchWithShortcut: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  useSearchShortcut(open);
  return (
    <>
      <output aria-label="Suche offen">{String(isOpen)}</output>
      <InstantSearchDialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        locale="de"
        searchPath="/de/suche"
      />
    </>
  );
};

const pressCtrlK = (target: Element): void => {
  act(() => {
    fireEvent.keyDown(target, { key: 'k', ctrlKey: true });
  });
};

/** The repeats a held Ctrl K sends after the first press; each one says whether it was prevented. */
const holdCtrlK = (target: Element): boolean[] =>
  [1, 2, 3].map(() => {
    let wasPrevented = false;
    act(() => {
      wasPrevented = !fireEvent.keyDown(target, { key: 'k', ctrlKey: true, repeat: true });
    });
    return wasPrevented;
  });

describe('InstantSearchDialog with the search shortcut', () => {
  it('opens on Ctrl K and closes again on Ctrl K, without the page reopening it', () => {
    render(<SearchWithShortcut />);
    const state = screen.getByLabelText('Suche offen');

    pressCtrlK(globalThis.document.body);
    expect(state).toHaveTextContent('true');

    pressCtrlK(screen.getByRole('searchbox'));
    expect(state).toHaveTextContent('false');
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('counts a held Ctrl K once, and keeps its repeats from the browser', () => {
    render(<SearchWithShortcut />);
    const state = screen.getByLabelText('Suche offen');

    pressCtrlK(globalThis.document.body);
    expect(holdCtrlK(globalThis.document.body)).toEqual([true, true, true]);
    expect(state).toHaveTextContent('true');

    const input = screen.getByRole('searchbox');
    expect(holdCtrlK(input)).toEqual([true, true, true]);
    expect(state).toHaveTextContent('true');
  });
});
