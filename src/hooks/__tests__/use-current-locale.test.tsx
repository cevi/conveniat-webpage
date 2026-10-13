import { RouteLocaleProvider, useCurrentLocale } from '@/hooks/use-current-locale';
import { i18nConfig } from '@/types/types';
import type React from 'react';
import { renderToString } from 'react-dom/server';

// What the library answers on the server for `/app/schedule`: it cannot see the cookie there, so
// a URL without a locale prefix is German to it, whatever locale the proxy served.
jest.mock('next-i18n-router/client', () => ({ useCurrentLocale: (): string => 'de' }));

const ShowLocale: React.FC = () => <p>{useCurrentLocale(i18nConfig)}</p>;

describe('useCurrentLocale on the server', () => {
  it('renders the locale of the route on a URL without a locale prefix', () => {
    const html = renderToString(
      <RouteLocaleProvider locale="fr">
        <ShowLocale />
      </RouteLocaleProvider>,
    );

    expect(html).toBe('<p>fr</p>');
  });

  it('leaves the answer to the library outside of the locale layout', () => {
    expect(renderToString(<ShowLocale />)).toBe('<p>de</p>');
  });
});
