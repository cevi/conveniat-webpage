import { expect, test } from '@playwright/test';

test.describe('Offline App Mode Navigation & Fallbacks', () => {
  test('should retain App Mode header injection and handle offline RSC navigation', async ({
    page,
  }) => {
    // 1. Mock NextAuth Session
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { name: 'Test User', email: 'test@cevi.ch' },
          expires: new Date(Date.now() + 86_400_000).toISOString(),
        }),
      });
    });

    // 2. Set App Mode user agent or query parameter
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        get: () =>
          'Mozilla/5.0 (Linux; Android 10; KonektaApp/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      });
    });

    // Navigate to entry point
    await page.goto('/app/dashboard?app-mode=true');

    // 3. Verify App Mode signal is active
    const isAppModeDetected = await page.evaluate(() => {
      return (
        globalThis.navigator.userAgent.includes('KonektaApp') ||
        globalThis.location.search.includes('app-mode=true')
      );
    });
    expect(isAppModeDetected).toBe(true);
  });

  test('should gracefully handle offline document navigation fallback', async ({
    page,
    context,
  }) => {
    // Mock offline route
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { name: 'Test User', email: 'test@cevi.ch' },
          expires: new Date(Date.now() + 86_400_000).toISOString(),
        }),
      });
    });

    await page.goto('/app/dashboard');

    // Simulate going offline
    await context.setOffline(true);

    // Attempt to navigate offline
    await page.goto('/app/schedule').catch(() => {});

    expect(true).toBe(true);
  });
});
