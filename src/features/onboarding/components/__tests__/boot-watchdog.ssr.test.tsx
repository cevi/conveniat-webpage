import { BootWatchdog, WATCHDOG_TIMEOUT_MS } from '@/features/onboarding/components/boot-watchdog';
import { renderToString } from 'react-dom/server';

/**
 * The watchdog's whole point is to work when the client bundle does not, so its behaviour lives
 * in server-rendered markup + an inline script. These assertions run against the raw SSR string,
 * the same bytes the browser receives before (or instead of) any hydration.
 */
describe('BootWatchdog server-rendered markup', () => {
  it('ships a localized reload fallback, hidden until the watchdog reveals it', () => {
    const html = renderToString(<BootWatchdog locale="de" />);

    expect(html).toContain('id="konekta-boot-fallback"');
    expect(html).toMatch(/display:\s*none/);
    expect(html).toContain('Neu laden');
    expect(html).toContain('id="konekta-boot-reload"');
  });

  it('localizes the fallback per locale', () => {
    expect(renderToString(<BootWatchdog locale="en" />)).toContain('Reload');
    expect(renderToString(<BootWatchdog locale="fr" />)).toContain('Recharger');
  });

  it('inlines a watchdog script gated on the hydration flag and the timeout', () => {
    const html = renderToString(<BootWatchdog locale="de" />);

    // Recovery is gated on the hydration marker, not fired unconditionally.
    expect(html).toContain('__konektaHydrated');
    expect(html).toContain(String(WATCHDOG_TIMEOUT_MS));
    // Auto-reload is budgeted so a permanently broken boot cannot loop.
    expect(html).toContain('konekta_boot_reload_attempted');
  });
});
