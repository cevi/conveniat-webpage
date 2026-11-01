import { GlobalAppFooterClientWrapper } from '@/components/footer/global-app-footer-client-wrapper';
import { renderToString } from 'react-dom/server';

let pathname = '/';
jest.mock('next/navigation', () => ({ usePathname: (): string => pathname }));
jest.mock('@/components/get-the-app', () => ({
  ShowGetTheAppButton: (): React.JSX.Element => <aside>get the app</aside>,
}));

const renderFooterAt = (path: string): string => {
  pathname = path;
  return renderToString(
    <GlobalAppFooterClientWrapper
      isAppMode={false}
      appNavBar={<nav>navigation</nav>}
      copyrightArea={<footer>copyright</footer>}
    />,
  );
};

describe('the footer in the browser', () => {
  it.each(['/app/dashboard', '/fr/app/map', '/app'])(
    'offers the app in the header instead of the copyright area on %s',
    (path) => {
      expect(renderFooterAt(path)).toBe('<aside>get the app</aside>');
    },
  );

  it.each(['/', '/kontakt', '/fr/contact', '/info/app/download', '/fr/info/app'])(
    'keeps the copyright area on the CMS page %s',
    (path) => {
      expect(renderFooterAt(path)).toBe('<footer>copyright</footer>');
    },
  );
});
