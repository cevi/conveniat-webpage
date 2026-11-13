/**
 * @jest-environment jsdom
 */
import { PageTitle } from '@/components/header/page-title';
import type { Locale } from '@/types/types';
import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

// tells React that `act` is in use here, so it neither warns nor leaves work unflushed
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// the segments below `[locale]/[design]`, where the header is rendered
let segments: string[] = [];
jest.mock('next/navigation', () => ({
  useSelectedLayoutSegments: (): string[] => segments,
}));

const titleAt = (
  routeSegments: string[],
  locale: Locale = 'de',
  dashboard: { title?: string; draftTitle?: string } = {},
): string => {
  segments = routeSegments;
  return renderToString(
    <PageTitle
      locale={locale}
      dashboardTitle={dashboard.title ?? 'Willkommen im Lager'}
      dashboardDraftTitle={dashboard.draftTitle}
    />,
  );
};

describe('the title in the header', () => {
  it.each([
    [['(app-pages)', 'app', 'schedule'], 'Programm', 'Programme', 'Program'],
    [['(app-pages)', 'app', 'schedule', '6720a3f1c2'], 'Programm', 'Programme', 'Program'],
    [['(app-pages)', 'app', 'map'], 'Lagerplatz', 'Terrain du camp', 'Campsite'],
    [['(app-pages)', 'app', 'chat', '0f6c', 'details'], 'Chats', 'Conversations', 'Chats'],
    [['(app-pages)', 'app', 'emergency'], 'Notfall', 'Urgence', 'Emergency'],
    [['(app-pages)', 'app', 'settings'], 'Einstellungen', 'Paramètres', 'Settings'],
    [
      ['(app-pages)', 'app', 'material', 'ausgeben'],
      'Materialdepot',
      'Dépôt de matériel',
      'Material depot',
    ],
    [['(app-pages)', 'app', 'wristbands'], 'Armbänder', 'Bracelets', 'Wristbands'],
    [['(app-pages)', 'app', 'forum', 'new'], 'Neuer Beitrag', 'Nouvelle publication', 'New post'],
    [['(app-pages)', 'app', 'forum', 'zentrale'], 'Zu tun', 'À faire', 'To do'],
    [
      ['(app-pages)', 'app', 'forum', 'topic', '0f6c', 'protocol'],
      'Protokoll',
      'Protocole',
      'Protocol',
    ],
  ])('names the app page %j in all three locales', (route, de, fr, en) => {
    expect(titleAt(route, 'de')).toBe(de);
    expect(titleAt(route, 'fr')).toBe(fr);
    expect(titleAt(route, 'en')).toBe(en);
  });

  it('names Home with the title the editors gave it', () => {
    expect(titleAt(['(app-pages)', 'app', 'dashboard'])).toBe('Willkommen im Lager');
  });

  it('shows the draft title in the live preview of Home, and only there', () => {
    const draft = { title: 'Willkommen im Lager', draftTitle: 'Hoi zäme' };
    expect(titleAt(['(app-pages)', 'app', 'dashboard-preview'], 'de', draft)).toBe('Hoi zäme');
    expect(titleAt(['(app-pages)', 'app', 'dashboard'], 'de', draft)).toBe('Willkommen im Lager');
  });

  it('falls back to the camp name while Home has no title, as in the build without a database', () => {
    expect(titleAt(['(app-pages)', 'app', 'dashboard'], 'de', { title: '' })).toBe('conveniat27');
  });

  it.each([
    [['(payload-pages)', 'kontakt']],
    // a CMS page whose slug starts with `app` is not an app page
    [['(payload-pages)', 'app']],
    [['~not-found']],
    [['(app-pages)', 'app', 'announcement-preview', '42']],
    [[]],
  ])('names %j with the camp name', (route) => {
    expect(titleAt(route)).toBe('conveniat27');
  });

  it('hydrates the title the server rendered without a mismatch', () => {
    const container = document.createElement('h1');
    container.innerHTML = titleAt(['(app-pages)', 'app', 'schedule'], 'fr');
    const errors: unknown[] = [];

    act(() => {
      hydrateRoot(container, <PageTitle locale="fr" dashboardTitle="Bienvenue" />, {
        onRecoverableError: (error) => errors.push(error),
      });
    });

    expect(errors).toEqual([]);
    expect(container.textContent).toBe('Programme');
  });
});
