/**
 * @jest-environment jsdom
 */

import { BootHydrationMarker } from '@/features/onboarding/components/boot-hydration-marker';
import { render } from '@testing-library/react';

const HYDRATED = (): boolean | undefined =>
  (globalThis as typeof globalThis & { __konektaHydrated?: boolean }).__konektaHydrated;

describe('BootHydrationMarker', () => {
  beforeEach(() => {
    delete (globalThis as typeof globalThis & { __konektaHydrated?: boolean }).__konektaHydrated;
    document.body.innerHTML = '';
    sessionStorage.clear();
  });

  it('marks the boot hydrated and hides an already-revealed fallback on mount', () => {
    document.body.innerHTML = '<div id="konekta-boot-fallback" style="display:flex"></div>';
    sessionStorage.setItem('konekta_boot_reload_attempted', '1');

    render(<BootHydrationMarker />);

    expect(HYDRATED()).toBe(true);
    expect(document.querySelector<HTMLElement>('#konekta-boot-fallback')?.style.display).toBe(
      'none',
    );
    // A clean boot re-arms the one-reload budget for any later stall in the session.
    expect(sessionStorage.getItem('konekta_boot_reload_attempted')).toBeNull();
  });
});
