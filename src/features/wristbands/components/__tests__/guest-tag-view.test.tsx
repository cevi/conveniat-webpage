/**
 * @jest-environment jsdom
 */

import { GuestTagView } from '@/features/wristbands/components/guest-tag-view';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    NEXT_PUBLIC_APP_STORE_URL: 'https://apps.apple.com/app/conveniat27',
    NEXT_PUBLIC_PLAY_STORE_URL: 'https://play.google.com/store/apps/details?id=ch.cevi',
  },
}));
jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));
jest.mock('@/components/header/header-actions', () => ({ SetHeaderActions: (): null => null }));
const signIn = jest.fn();
jest.mock('next-auth/react', () => ({
  signIn: (...arguments_: unknown[]): unknown => signIn(...arguments_),
}));
// the header's app button and its sheet are not under test
jest.mock('@/components/get-the-app', () => ({ isAppOffered: true }));

const storeLinks = (): HTMLElement[] => screen.queryAllByRole('link', { name: /laden/ });

describe('a band tapped by a guest', () => {
  it('says nothing about the band', () => {
    render(<GuestTagView inAppDesign={false} callbackUrl="/tag/0462415A7E2490" />);
    expect(screen.getByRole('heading')).toHaveTextContent('Melde dich an, um Armbänder zu sehen.');
    expect(document.body).not.toHaveTextContent('0462415A7E2490');
  });

  it('offers the login and the stores on the website', () => {
    render(<GuestTagView inAppDesign={false} callbackUrl="/tag/0462415A7E2490" />);
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden mit Cevi.DB' }));
    expect(signIn).toHaveBeenCalledWith('cevi-db', { callbackUrl: '/tag/0462415A7E2490' });
    expect(storeLinks().map((link) => link.textContent)).toEqual([
      'Im App Store laden',
      'Bei Google Play laden',
    ]);
  });

  it('offers only the login inside the app', () => {
    render(<GuestTagView inAppDesign callbackUrl="/tag/0462415A7E2490" />);
    expect(screen.getByRole('button', { name: 'Anmelden mit Cevi.DB' })).toBeInTheDocument();
    expect(storeLinks()).toEqual([]);
  });
});
