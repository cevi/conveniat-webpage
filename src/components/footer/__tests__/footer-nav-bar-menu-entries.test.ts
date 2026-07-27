import { resolveAppNavBarEntries } from '@/components/footer/footer-nav-bar-menu-entries';

describe('resolveAppNavBarEntries', () => {
  it('returns default menu entries when cmsItems is null, undefined, or empty', () => {
    const deEntries = resolveAppNavBarEntries(undefined, 'de');
    expect(deEntries).toHaveLength(5);
    expect(deEntries[0]).toEqual({
      iconName: 'MessageSquare',
      label: 'Chats',
      href: '/app/chat',
      color: undefined,
    });
    expect(deEntries[1]).toEqual({
      iconName: 'Siren',
      label: 'Notfall',
      href: '/app/emergency',
      color: 'red',
    });
    expect(deEntries[2]).toEqual({
      iconName: 'House',
      label: 'Home',
      href: '/app/dashboard',
      color: undefined,
    });
    expect(deEntries[4]).toEqual({
      iconName: 'Calendar',
      label: 'Programm',
      href: '/app/schedule',
      color: undefined,
    });

    const frEntries = resolveAppNavBarEntries([], 'fr');
    expect(frEntries[1]?.label).toBe('Urgence');
    expect(frEntries[2]?.label).toBe('Accueil');
  });

  it('maps custom CMS menu entries with corresponding icon names and colors', () => {
    const customCmsItems = [
      {
        label: 'Chat Room',
        icon: 'MessageSquare',
        href: '/app/chat',
        color: 'default',
      },
      {
        label: 'Alarm',
        icon: 'Siren',
        href: '/app/emergency',
        color: 'red',
      },
      {
        label: 'Custom Page',
        icon: 'UnknownIconKey',
        href: '/custom-page',
        color: 'green',
      },
    ];

    const resolved = resolveAppNavBarEntries(customCmsItems, 'de');
    expect(resolved).toHaveLength(3);

    expect(resolved[0]).toEqual({
      iconName: 'MessageSquare',
      label: 'Chat Room',
      href: '/app/chat',
      color: undefined,
    });

    expect(resolved[1]).toEqual({
      iconName: 'Siren',
      label: 'Alarm',
      href: '/app/emergency',
      color: 'red',
    });

    // Unknown icon falls back to House
    expect(resolved[2]).toEqual({
      iconName: 'House',
      label: 'Custom Page',
      href: '/custom-page',
      color: 'green',
    });
  });
});
