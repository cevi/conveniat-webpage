import { expect, test } from '@playwright/test';

/**
 * Relaunching the installed app goes through the manifest's `start_url`, `/entrypoint`, which
 * registers the service worker on its own before handing over to the app layout, which registers
 * it again. When the two registrations disagreed on the worker type, the browser installed and
 * activated a fresh worker on every launch, and that re-ran the whole offline download.
 */
test.describe('Service worker across app launches', () => {
  test('does not activate a new worker when the app is launched again', async ({
    page,
    context,
  }) => {
    let activations = 0;
    context.on('console', (message) => {
      if (message.text().includes('[SW] Activated')) activations++;
    });

    const launch = async (): Promise<void> => {
      await page.goto('/entrypoint?app-mode=true');
      await page.goto('/app/dashboard');
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
      // Give a registration update the time to install and activate a new worker.
      await page.waitForTimeout(4000);
    };

    await launch();
    const activationsAfterInstall = activations;

    await launch();
    await launch();

    expect(activations).toBe(activationsAfterInstall);
  });
});
