/**
 * @jest-environment jsdom
 */

import { DesktopNav } from '@/components/menu/desktop-nav';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { NEXT_PUBLIC_APP_HOST_URL: 'https://conveniat27.ch' },
}));
jest.mock('next/navigation', () => ({
  usePathname: (): string => '/',
  useSearchParams: (): URLSearchParams => new URLSearchParams(),
}));
jest.mock('@/hooks/use-preview-mode', () => ({
  usePreviewMode: (): { isInPreviewMode: string } => ({ isInPreviewMode: 'disabled' }),
}));
jest.mock('@/features/payload-cms/components/search/instant-search-dialog', () => ({
  InstantSearchDialog: (): null => null,
}));
jest.mock('@/components/menu/use-fitting-item-count', () => ({
  useFittingItemCount: (): number => 0,
}));

const renderNav = (): HTMLElement => {
  render(<DesktopNav locale="de" menuItems={[]} actionURL="/suche" />);
  return screen.getByRole('button', { name: 'de' });
};

const languages = (): HTMLElement | null => screen.queryByRole('button', { name: 'Français' });

describe('the language button of the desktop navigation', () => {
  it('shows the languages on the click of a visitor who moved the mouse onto it', () => {
    const button = renderNav();

    // a mouse always enters the button before it clicks it
    fireEvent.mouseEnter(button);
    fireEvent.mouseOver(button);
    fireEvent.click(button);

    expect(languages()).not.toBeNull();
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('hides them again on a second click, on Escape and on a press elsewhere', () => {
    const button = renderNav();

    fireEvent.click(button);
    fireEvent.click(button);
    expect(languages()).toBeNull();

    fireEvent.click(button);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(languages()).toBeNull();

    fireEvent.click(button);
    fireEvent.pointerDown(document.body);
    expect(languages()).toBeNull();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
});
