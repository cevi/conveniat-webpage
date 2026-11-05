/**
 * @jest-environment jsdom
 */

import TagPage from '@/app/(frontend)/[locale]/[design]/(app-pages)/tag/[uid]/page';
import { DesignCodes } from '@/utils/design-codes';
import { render, screen } from '@testing-library/react';

let mockSession: unknown;
const notFound = jest.fn((): never => {
  throw new Error('NEXT_NOT_FOUND');
});

jest.mock('@/utils/auth', () => ({ auth: (): Promise<unknown> => Promise.resolve(mockSession) }));
jest.mock('@/utils/auth-helpers', () => ({
  isValidNextAuthUser: (user: unknown): boolean => user !== undefined,
}));
jest.mock('next/navigation', () => ({ notFound: (): never => notFound() }));
// the views fetch through tRPC on the client; here it only matters which one the page picks
jest.mock('@/features/wristbands/components/tag-view', () => ({
  TagView: ({ uid }: { uid: string }): React.JSX.Element => <p>band {uid}</p>,
}));
jest.mock('@/features/wristbands/components/guest-tag-view', () => ({
  GuestTagView: ({
    inAppDesign,
    callbackUrl,
  }: {
    inAppDesign: boolean;
    callbackUrl: string;
  }): React.JSX.Element => (
    <p>
      login back to {callbackUrl}
      {inAppDesign ? ' in the app' : ' on the website'}
    </p>
  ),
}));

const renderPage = async (
  uid: string,
  design = DesignCodes.WEB_DESIGN,
  locale: 'de' | 'fr' = 'de',
): Promise<void> => {
  render(await TagPage({ params: Promise.resolve({ uid, locale, design }) }));
};

beforeEach(() => {
  mockSession = { user: { uuid: 'flurin' } };
  notFound.mockClear();
});

describe('the page a tapped band opens', () => {
  it('shows a guest only the login, which returns to the same band', async () => {
    mockSession = null;
    await renderPage('0462415a7e2490');
    expect(
      screen.getByText('login back to /tag/0462415A7E2490 on the website'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^band /)).not.toBeInTheDocument();
  });

  it('returns a guest to the band in their locale and design', async () => {
    mockSession = null;
    await renderPage('0462415A7E2490', DesignCodes.APP_DESIGN, 'fr');
    expect(screen.getByText('login back to /fr/tag/0462415A7E2490 in the app')).toBeInTheDocument();
  });

  it('asks the server about the band for someone signed in, by its UID in capitals', async () => {
    await renderPage('0462415a7e2490');
    expect(screen.getByText('band 0462415A7E2490')).toBeInTheDocument();
  });

  it.each(['0462415A7E24', '0462415A7E2490FF', 'ZZ62415A7E2490', 'favicon.ico'])(
    'is not found for %s, which is no band',
    async (uid) => {
      await expect(renderPage(uid)).rejects.toThrow('NEXT_NOT_FOUND');
      expect(notFound).toHaveBeenCalled();
    },
  );
});
