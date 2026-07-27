import { resolveAppNavBarEntries } from '@/components/footer/footer-nav-bar-menu-entries';
import { Calendar, House, MessageSquare, Siren } from 'lucide-react';

describe('resolveAppNavBarEntries', () => {
  it('returns default menu entries when cmsItems is null, undefined, or empty', () => {
    const deEntries = resolveAppNavBarEntries(undefined, 'de');
    expect(deEntries).toHaveLength(5);
    expect(deEntries[0]).toEqual({
      icon: MessageSquare,
      label: 'Chats',
      href: '/app/chat',
      color: undefined,
    });
    expect(deEntries[1]).toEqual({
      icon: Siren,
      label: 'Notfall',
      href: '/app/emergency',
      color: 'red',
    });
    expect(deEntries[2]).toEqual({
      icon: House,
      label: 'Home',
      href: '/app/dashboard',
      color: undefined,
    });
    expect(deEntries[4]).toEqual({
      icon: Calendar,
      label: 'Programm',
      href: '/app/schedule',
      color: undefined,
    });

    const frEntries = resolveAppNavBarEntries([], 'fr');
    expect(frEntries[1]?.label).toBe('Urgence');
    expect(frEntries[2]?.label).toBe('Accueil');
  });

  it('maps custom CMS menu entries with corresponding icons and colors', () => {
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
      icon: MessageSquare,
      label: 'Chat Room',
      href: '/app/chat',
      color: undefined,
    });

    expect(resolved[1]).toEqual({
      icon: Siren,
      label: 'Alarm',
      href: '/app/emergency',
      color: 'red',
    });

    // Unknown icon falls back to House
    expect(resolved[2]).toEqual({
      icon: House,
      label: 'Custom Page',
      href: '/custom-page',
      color: 'green',
    });
  });
});
