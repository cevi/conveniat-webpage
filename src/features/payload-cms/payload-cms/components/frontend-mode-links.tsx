'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { Cookie } from '@/types/types';
import Cookies from 'js-cookie';
import { Monitor, Smartphone } from 'lucide-react';
import type React from 'react';

const openAppModeLabel: StaticTranslationString = {
  de: 'App-Ansicht öffnen',
  en: 'Open app view',
  fr: "Ouvrir la vue de l'app",
};

const openWebModeLabel: StaticTranslationString = {
  de: 'Web-Ansicht öffnen',
  en: 'Open web view',
  fr: 'Ouvrir la vue web',
};

/** Handled by the onboarding flow, which persists the app design in the `design-mode` cookie. */
const APP_MODE_URL = '/entrypoint?force-app-mode=true';

/**
 * The app design sticks to the browser through cookies, so opening the web view has to clear
 * them first, otherwise an editor who once opened the app view could never get back.
 */
const leaveAppMode = (): void => {
  Cookies.remove(Cookie.DESIGN_MODE, { path: '/' });
  Cookies.remove('x-app-mode-initial', { path: '/' });
};

const linkClassName =
  'font-heading border-conveniat-green text-conveniat-green hover:bg-conveniat-green inline-flex items-center gap-2 rounded-[8px] border px-4 py-2 text-sm font-bold no-underline duration-100 hover:text-white';

/**
 * Links from the admin dashboard to the frontend, opened either in the app design or in the web
 * design, so editors can check how their content looks in both.
 */
export const FrontendModeLinks: React.FC<{ locale: Locale }> = ({ locale }) => (
  <div className="flex flex-wrap gap-2">
    <a href={APP_MODE_URL} target="_blank" rel="noopener noreferrer" className={linkClassName}>
      <Smartphone className="size-4" aria-hidden />
      {openAppModeLabel[locale]}
    </a>
    <a
      href="/"
      target="_blank"
      rel="noopener noreferrer"
      onClick={leaveAppMode}
      onAuxClick={leaveAppMode}
      className={linkClassName}
    >
      <Monitor className="size-4" aria-hidden />
      {openWebModeLabel[locale]}
    </a>
  </div>
);
