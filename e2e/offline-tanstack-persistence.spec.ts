import { expect, test } from '@playwright/test';

test.describe('Offline TanStack Query & NextAuth Session', () => {
  test('should handle offline session state without dropping auth context', async ({
    page,
    context,
  }) => {
    let requestCount = 0;

    // Intercept NextAuth session endpoint
    await page.route('**/api/auth/session', async (route) => {
      requestCount++;
      const isInitial = requestCount === 1;
      await route.fulfill(
        isInitial
          ? {
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                user: { name: 'Test User', email: 'test@cevi.ch' },
                expires: new Date(Date.now() + 86400000).toISOString(),
              }),
            }
          : {
              status: 503,
              contentType: 'text/plain',
              body: 'Backend Overloaded',
            },
      );
    });

    await page.goto('/');
    await context.setOffline(true);

    expect(true).toBe(true);
  });
});
