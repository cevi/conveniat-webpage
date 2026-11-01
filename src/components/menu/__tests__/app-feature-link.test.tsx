/**
 * @jest-environment jsdom
 */

import { AppFeatureLink, CurrentMenuPathContext } from '@/components/menu/app-feature-link';
import { render, screen } from '@testing-library/react';
import type React from 'react';

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { NEXT_PUBLIC_APP_HOST_URL: 'https://conveniat27.ch' },
}));

const renderOn = (pathname: string | undefined, href: string): HTMLElement => {
  const link: React.ReactNode = (
    <AppFeatureLink href={href} openInNewTab={false}>
      Chat
    </AppFeatureLink>
  );
  render(
    pathname === undefined ? (
      link
    ) : (
      <CurrentMenuPathContext value={pathname}>{link}</CurrentMenuPathContext>
    ),
  );
  return screen.getByRole('link', { name: 'Chat' });
};

describe('AppFeatureLink', () => {
  it('marks the link of the open page', () => {
    expect(renderOn('/app/chat', '/app/chat')).toHaveAttribute('aria-current', 'page');
  });

  it('marks it on a page below it, like an open chat, and in another locale', () => {
    expect(renderOn('/fr/app/chat/123', '/app/chat')).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark a link whose path only starts the same', () => {
    expect(renderOn('/app/chat-archive', '/app/chat')).not.toHaveAttribute('aria-current');
  });

  it('marks nothing where no menu provides the open page, as in the phone drawer', () => {
    expect(renderOn(undefined, '/app/chat')).not.toHaveAttribute('aria-current');
  });
});
