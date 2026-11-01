import { expect, test } from '@playwright/test';

import {
  downloadOfflinePages,
  emergencyCard,
  mockAppBackend,
  NATIVE_APP_USER_AGENT,
  waitForPersisted,
  waitForServiceWorker,
} from './fixtures/offline-app-data';
import { signIn } from './fixtures/sign-in';

test.use({ userAgent: NATIVE_APP_USER_AGENT });

test.describe('Offline Static JS/CSS Chunk & Manifest Resilience', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
    await mockAppBackend(context);
  });

  test('should navigate to emergency page offline without ChunkLoadError or manifest failures', async ({
    page,
    context,
  }) => {
    // the dashboard online, then the download; the emergency page itself was never opened
    await page.goto('/app/dashboard', { waitUntil: 'networkidle' });
    await waitForServiceWorker(page);
    await downloadOfflinePages(page);
    await page.goto('/app/emergency');
    await expect(page.getByText(emergencyCard.title)).toBeVisible();
    await waitForPersisted(page, 'emergency.getEmergencyCards');
    await page.goto('/app/dashboard');

    const chunkErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && message.text().includes('ChunkLoadError')) {
        chunkErrors.push(message.text());
      }
    });
    await context.setOffline(true);

    await page.goto('/app/emergency');

    await expect(page.getByText(emergencyCard.title)).toBeVisible();
    expect(chunkErrors).toHaveLength(0);
  });
});
