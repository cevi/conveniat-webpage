import { isCurrentMenuPath } from '@/components/menu/menu-link';

jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));
jest.mock('@/components/ui/link-component', () => ({}));

describe('isCurrentMenuPath', () => {
  it('marks the entry of the page the user is on, in any locale', () => {
    expect(isCurrentMenuPath('/app/chat', '/app/chat', false)).toBe(true);
    expect(isCurrentMenuPath('/fr/app/chat', '/app/chat', false)).toBe(true);
    expect(isCurrentMenuPath('/fr/ueber-uns', '/fr/ueber-uns/', false)).toBe(true);
    expect(isCurrentMenuPath('/en', '/', false)).toBe(true);
  });

  it('marks an app feature on the pages below it, but not the start page on every page', () => {
    expect(isCurrentMenuPath('/app/chat/abc', '/app/chat', true)).toBe(true);
    expect(isCurrentMenuPath('/app/chat/abc', '/app/chat', false)).toBe(false);
    expect(isCurrentMenuPath('/app/chatroom', '/app/chat', true)).toBe(false);
    expect(isCurrentMenuPath('/app/chat', '/', true)).toBe(false);
  });

  it('ignores query and hash of the link', () => {
    expect(isCurrentMenuPath('/app/schedule', '/app/schedule?date=2027-07-24#top', false)).toBe(
      true,
    );
  });

  it('counts an absolute link only when it points at this deployment', () => {
    expect(isCurrentMenuPath('/app/map', 'https://conveniat27.ch/app/map', false)).toBe(false);
    expect(
      isCurrentMenuPath('/app/map', 'https://conveniat27.ch/app/map', false, 'conveniat27.ch'),
    ).toBe(true);
    expect(isCurrentMenuPath('/app/map', 'https://cevi.ch/app/map', false, 'conveniat27.ch')).toBe(
      false,
    );
    expect(isCurrentMenuPath('/', 'mailto:info@example.ch', false, 'conveniat27.ch')).toBe(false);
  });
});
