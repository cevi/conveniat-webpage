/**
 * @jest-environment jsdom
 */

import { FrontendModeLinks } from '@/features/payload-cms/payload-cms/components/frontend-mode-links';
import { Cookie } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { fireEvent, render, screen } from '@testing-library/react';
import Cookies from 'js-cookie';

describe('FrontendModeLinks', () => {
  afterEach(() => {
    Cookies.remove(Cookie.DESIGN_MODE, { path: '/' });
    Cookies.remove('x-app-mode-initial', { path: '/' });
  });

  it('opens the app view through the force-app-mode entrypoint in a new tab', () => {
    render(<FrontendModeLinks locale="en" />);

    const link = screen.getByRole('link', { name: 'Open app view' });
    expect(link.getAttribute('href')).toBe('/entrypoint?force-app-mode=true');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('clears a persisted app design before opening the web view', () => {
    Cookies.set(Cookie.DESIGN_MODE, DesignCodes.APP_DESIGN, { path: '/' });
    Cookies.set('x-app-mode-initial', 'true', { path: '/' });
    render(<FrontendModeLinks locale="de" />);

    const link = screen.getByRole('link', { name: 'Web-Ansicht öffnen' });
    // jsdom does not navigate, so the click only runs the handler
    fireEvent.click(link);

    expect(link.getAttribute('href')).toBe('/');
    expect(Cookies.get(Cookie.DESIGN_MODE)).toBeUndefined();
    expect(Cookies.get('x-app-mode-initial')).toBeUndefined();
  });
});
