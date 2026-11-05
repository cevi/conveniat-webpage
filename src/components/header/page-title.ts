'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { useSelectedLayoutSegments } from 'next/navigation';
import type React from 'react';

/**
 * The title of a page that has no name of its own in the header, such as a page of the website:
 * the camp's name.
 */
export const DEFAULT_APP_TITLE = 'conveniat27';

/** What the app's pages are called in the header, by their segment below `/app`. */
const appPageTitles: Record<string, StaticTranslationString> = {
  // the same words as the tabs that open them
  schedule: { de: 'Programm', en: 'Program', fr: 'Programme' },
  emergency: { de: 'Notfall', en: 'Emergency', fr: 'Urgence' },
  map: { de: 'Lagerplatz', en: 'Campsite', fr: 'Terrain du camp' },
  chat: { de: 'Chats', en: 'Chats', fr: 'Conversations' },
  forum: { de: 'Forum', en: 'Forum', fr: 'Forum' },
  settings: { de: 'Einstellungen', en: 'Settings', fr: 'Paramètres' },
  'helper-portal': { de: 'Schichteinsätze', en: 'Helper Shifts', fr: 'Services de helpers' },
  'photo-contest': { de: 'Foto-Wettbewerb', en: 'Photo Contest', fr: 'Concours Photo' },
  'upload-images': { de: 'Bild-Upload', en: 'Image Upload', fr: "Téléchargement d'images" },
  material: { de: 'Materialdepot', en: 'Material depot', fr: 'Dépôt de matériel' },
};

/**
 * The page's title in the header, decided from the route the header is rendered for. The server
 * and the browser read the same segments, so the prerendered header already names the page and
 * hydrates without a mismatch. The segments come from the route tree, not the URL, so the proxy's
 * rewrite of `/app/schedule` to `/de/design-mode-app/app/schedule` does not change them.
 *
 * Home is named in the CMS (App Landing Page, title); the live preview of that global shows the
 * draft's title, which the header receives for an editor only.
 */
export const PageTitle: React.FC<{
  locale: Locale;
  dashboardTitle: string;
  dashboardDraftTitle?: string | undefined;
}> = ({ locale, dashboardTitle, dashboardDraftTitle }) => {
  // below `[locale]/[design]`: the route group first, then `app` and the page
  const [group, app, page] = useSelectedLayoutSegments();
  if (group !== '(app-pages)' || app !== 'app' || page === undefined) return DEFAULT_APP_TITLE;

  if (page === 'dashboard' || page === 'dashboard-preview') {
    const title =
      page === 'dashboard-preview' ? (dashboardDraftTitle ?? dashboardTitle) : dashboardTitle;
    // empty while the build prerenders without a database, and in a draft that skips validation
    return title === '' ? DEFAULT_APP_TITLE : title;
  }

  return appPageTitles[page]?.[locale] ?? DEFAULT_APP_TITLE;
};
