/**
 * @jest-environment jsdom
 */

import type { Contact } from '@/features/chat/api/queries/list-contacts';
import { useOpenChatWithContact } from '@/features/chat/hooks/use-open-chat-with-contact';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { Activity, createContext, useContext, useState } from 'react';

const PathnameContext = createContext('/de/app/chat/new');
const routerReplace = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: (): string => useContext(PathnameContext),
  useRouter: (): { push: jest.Mock; replace: jest.Mock } => ({
    push: jest.fn(),
    replace: routerReplace,
  }),
}));
jest.mock('@/features/chat/hooks/use-create-chat', () => ({
  useCreateChat: (): { createChat: () => string } => ({ createChat: () => 'chat-1' }),
}));

const contacts = [{ userId: 'adler' }, { userId: 'vanille' }] as Contact[];

const Contacts: React.FC = () => {
  const { openChatWith, openingUserId } = useOpenChatWithContact('replace');
  return (
    <ul>
      {contacts.map((contact) => (
        <li key={contact.userId}>
          <button
            type="button"
            onClick={() => openChatWith(contact)}
            aria-busy={openingUserId === contact.userId}
            disabled={openingUserId !== undefined && openingUserId !== contact.userId}
          >
            {contact.userId}
          </button>
        </li>
      ))}
    </ul>
  );
};

/** The new chat screen the way Next.js keeps it: hidden in an Activity once the user left it. */
const Routes: React.FC = () => {
  const [pathname, setPathname] = useState('/de/app/chat/new');
  return (
    <PathnameContext value={pathname}>
      <button type="button" onClick={() => setPathname('/de/app/chat/chat-1')}>
        to the chat
      </button>
      <button type="button" onClick={() => setPathname('/de/app/chat/new')}>
        back to the list
      </button>
      <Activity mode={pathname === '/de/app/chat/new' ? 'visible' : 'hidden'}>
        <Contacts />
      </Activity>
    </PathnameContext>
  );
};

const row = (name: string): HTMLButtonElement =>
  screen.getByRole<HTMLButtonElement>('button', { name, hidden: true });

describe('useOpenChatWithContact', () => {
  it('opens one chat at a time, the tapped row busy', () => {
    render(<Routes />);
    fireEvent.click(row('adler'));
    expect(routerReplace).toHaveBeenCalledWith('/app/chat/chat-1');
    expect(row('adler')).toHaveAttribute('aria-busy', 'true');
    expect(row('vanille')).toBeDisabled();
  });

  it('is ready for the next chat when the user comes back to the list', () => {
    render(<Routes />);
    fireEvent.click(row('adler'));
    fireEvent.click(screen.getByText('to the chat'));
    fireEvent.click(screen.getByText('back to the list'));

    expect(row('adler')).toHaveAttribute('aria-busy', 'false');
    expect(row('vanille')).toBeEnabled();
    routerReplace.mockClear();
    fireEvent.click(row('adler'));
    expect(routerReplace).toHaveBeenCalledWith('/app/chat/chat-1');
  });
});
