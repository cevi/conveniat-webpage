import { expect, test } from '@playwright/test';

/**
 * Camp wifi drops and comes back every few minutes. A reconnect must not reload the page, or
 * every drop throws away what the user was typing or reading.
 */
test.describe('Reconnecting', () => {
  test('keeps the page when the connection comes back', async ({ page, context }) => {
    await page.goto('/app/dashboard');
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

    let loads = 0;
    page.on('load', () => loads++);
    await page.evaluate(() => {
      (globalThis as unknown as { reconnectMarker: boolean }).reconnectMarker = true;
    });

    await context.setOffline(true);
    await page.waitForTimeout(1000);
    await context.setOffline(false);
    await page.waitForTimeout(3000);

    expect(loads).toBe(0);
    const markerSurvived = await page.evaluate(
      () => (globalThis as unknown as { reconnectMarker?: boolean }).reconnectMarker === true,
    );
    expect(markerSurvived).toBe(true);
  });
});
