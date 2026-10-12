/**
 * @jest-environment jsdom
 */

import { AdminNavClient } from '@/features/payload-cms/payload-cms/components/admin-nav/admin-nav-client';
import type { AdminNavGroup } from '@/features/payload-cms/payload-cms/components/admin-nav/admin-nav-groups';
import { render, screen } from '@testing-library/react';
import type React from 'react';

jest.mock('next/navigation', () => ({ usePathname: (): string => '/admin' }));

jest.mock('@payloadcms/ui', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }): React.JSX.Element => (
    <a href={href}>{children}</a>
  ),
  NavGroup: ({
    children,
    isOpen,
    label,
  }: {
    children: React.ReactNode;
    isOpen?: boolean;
    label: string;
  }): React.JSX.Element => (
    <section aria-label={label} data-open={String(isOpen)}>
      {children}
    </section>
  ),
}));

const groups: AdminNavGroup[] = [
  {
    label: 'Webseite · Inhalte',
    links: [{ id: 'nav-generic-page', href: '/admin/collections/generic-page', label: 'Seiten' }],
  },
];

describe('AdminNavClient', () => {
  it('renders the sidebar for a user who closed the sidebar but never collapsed a group', () => {
    // Payload stores `{ open }` alone until the first group is toggled
    render(<AdminNavClient groups={groups} navPreferences={{ open: false }} />);

    expect(screen.getByRole('link', { name: 'Seiten' })).toBeTruthy();
    expect(screen.getByLabelText('Webseite · Inhalte').dataset['open']).toBe('undefined');
  });

  it('keeps a group collapsed that the user collapsed', () => {
    render(
      <AdminNavClient
        groups={groups}
        navPreferences={{ open: true, groups: { 'Webseite · Inhalte': { open: false } } }}
      />,
    );

    expect(screen.getByLabelText('Webseite · Inhalte').dataset['open']).toBe('false');
  });
});
