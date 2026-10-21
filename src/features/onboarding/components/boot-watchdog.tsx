import type { StaticTranslationString } from '@/types/types';
import { type Locale } from '@/types/types';
import type React from 'react';

/**
 * How long the entrypoint may take to become interactive before the watchdog acts.
 *
 * The onboarding screen animates a loading bar during this window, so the wait reads as
 * "still loading" rather than "frozen". Ten seconds comfortably clears a slow-but-working
 * bundle download on a weak mobile link, so a stall still pending at the deadline is far more
 * likely a dead connection or a failed chunk than a download in progress.
 */
export const WATCHDOG_TIMEOUT_MS = 10_000;

const bootStalledMessage: StaticTranslationString = {
  de: 'Die App braucht ungewöhnlich lange zum Laden.',
  en: 'The app is taking unusually long to load.',
  fr: "L'application met un temps inhabituellement long à charger.",
};

const bootReloadLabel: StaticTranslationString = {
  de: 'Neu laden',
  en: 'Reload',
  fr: 'Recharger',
};

/**
 * Boot watchdog — recovers the onboarding entrypoint when the client bundle never runs.
 *
 * The entrypoint is server-rendered and only becomes interactive once the Next.js chunks under
 * `/_next/static` load and React hydrates. On a weak connection those chunks can stall or fail
 * after the HTML has already arrived, leaving the user on a static page with no way forward — the
 * exact "stuck on the loading screen" report this guards against (2026-08-21, iOS). Nothing in
 * the app bundle can rescue that state, because the app bundle is the thing that failed to load.
 *
 * The escape hatch therefore lives entirely in this inline `<script>`. Inline scripts execute
 * during HTML parsing, independent of the external chunks, so this runs even when the app never
 * does (the sibling native-push script in the layout relies on the same guarantee).
 *
 * Behaviour, `WATCHDOG_TIMEOUT_MS` after parse, if `window.__konektaHydrated` is still unset
 * (see {@link ../components/boot-hydration-marker#BootHydrationMarker}):
 *   1. First boot of the session — reload once. A stalled chunk request is dropped and retried,
 *      which recovers the common transient-network case automatically.
 *   2. If the reloaded attempt also fails to hydrate — reveal a manual reload button, so a
 *      genuinely offline or broken-deploy boot leaves the user an affordance instead of a dead
 *      screen. The one-reload budget (a sessionStorage flag) prevents a reload loop.
 *
 * A late hydration that lands after the deadline is harmless: the marker clears the flag and
 * hides the fallback, so a false positive on a slow-but-working device self-corrects.
 */
export const BootWatchdog: React.FC<{ locale: Locale }> = ({ locale }) => {
  return (
    <>
      {/*
        Plain markup, hidden by default. The reload button carries no React handler — it is wired
        by the inline script below, because in the failure mode React never hydrates it. Only
        `display` is toggled inline so the flex layout classes apply once it is shown.
      */}
      <div
        id="konekta-boot-fallback"
        style={{ display: 'none' }}
        className="fixed inset-x-0 bottom-0 z-[9999] flex-col items-center gap-3 bg-white/95 p-6 text-center shadow-[0_-2px_16px_rgba(0,0,0,0.12)]"
      >
        <p className="max-w-sm text-balance text-gray-700">{bootStalledMessage[locale]}</p>
        <button
          id="konekta-boot-reload"
          type="button"
          className="font-heading cursor-pointer rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 shadow-md"
        >
          {bootReloadLabel[locale]}
        </button>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var T=${WATCHDOG_TIMEOUT_MS},K='konekta_boot_reload_attempted';function id(i){return document.getElementById(i)}function wire(){var b=id('konekta-boot-reload');if(b)b.addEventListener('click',function(){try{sessionStorage.removeItem(K)}catch(e){}try{location.reload()}catch(e){}})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();setTimeout(function(){if(window.__konektaHydrated)return;var a=false;try{a=sessionStorage.getItem(K)==='1'}catch(e){}if(!a){try{sessionStorage.setItem(K,'1')}catch(e){}try{location.reload();return}catch(e){}}var el=id('konekta-boot-fallback');if(el)el.style.display='flex'},T)})();`,
        }}
      />
    </>
  );
};
