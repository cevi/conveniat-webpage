/**
 * @jest-environment jsdom
 */
import { LinkComponent } from '@/components/ui/link-component';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { NEXT_PUBLIC_APP_HOST_URL: 'https://conveniat27.ch' },
}));

// stands in for the router link, which is what prefetches
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    target,
  }: {
    children: React.ReactNode;
    href: string;
    target?: string;
  }): React.ReactElement => (
    <a href={href} target={target} data-router-link="true">
      {children}
    </a>
  ),
}));

const isRouterLink = (name: string): boolean =>
  screen.getByRole('link', { name }).dataset['routerLink'] === 'true';

describe('LinkComponent', () => {
  it('keeps pages on the router link', () => {
    render(<LinkComponent href="/ueber-uns">Über uns</LinkComponent>);

    expect(isRouterLink('Über uns')).toBe(true);
  });

  it('renders a file link as a plain anchor, so the router never prefetches the file', () => {
    render(
      <LinkComponent
        href="/api/documents/file/packliste.pdf?locale=de"
        openInNewTab
        prefetch={false}
        hideExternalIcon
      >
        Packliste
      </LinkComponent>,
    );

    const link = screen.getByRole('link', { name: 'Packliste' });
    expect(isRouterLink('Packliste')).toBe(false);
    expect(link.getAttribute('href')).toBe('/api/documents/file/packliste.pdf?locale=de');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.hasAttribute('prefetch')).toBe(false);
  });

  it('keeps the styling and the click handler of a file link', () => {
    const onClick = jest.fn();
    render(
      <LinkComponent
        href="/api/documents/file/packliste.pdf"
        className="block p-3"
        onClick={onClick}
      >
        Packliste
      </LinkComponent>,
    );

    const link = screen.getByRole('link', { name: 'Packliste' });
    fireEvent.click(link);

    expect(link.className).toBe('block p-3');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('recognises a file link that carries the host of the deployment', () => {
    render(
      <LinkComponent href="https://conveniat27.ch/api/documents/file/packliste.pdf">
        Packliste
      </LinkComponent>,
    );

    expect(isRouterLink('Packliste')).toBe(false);
  });

  it('leaves a page whose path only starts like the API on the router link', () => {
    render(<LinkComponent href="/apis-und-daten">APIs</LinkComponent>);

    expect(isRouterLink('APIs')).toBe(true);
  });

  it('leaves the API of another host alone', () => {
    render(<LinkComponent href="https://db.cevi.ch/api/groups">Cevi.DB</LinkComponent>);

    expect(isRouterLink('Cevi.DB')).toBe(true);
  });
});
