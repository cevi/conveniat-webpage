import { expect, test } from '@playwright/test';

import {
  chatPreview,
  cutTrpc,
  downloadOfflinePages,
  emergencyCard,
  mockAppBackend,
  NATIVE_APP_USER_AGENT,
  scheduleEntry,
  waitForPersisted,
  waitForServiceWorker,
} from './fixtures/offline-app-data';
import { signIn } from './fixtures/sign-in';

test.use({ userAgent: NATIVE_APP_USER_AGENT });

/** What the app's error boundary shows when a page crashes. */
const ERROR_SCREEN = 'Es ist ein Fehler aufgetreten';

test.describe('Offline Flaky Network & Unstable Connection Resilience', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
    await mockAppBackend(context);
  });

  test('should navigate app pages seamlessly offline without throwing RSC stream syntax errors', async ({
    page,
    context,
  }) => {
    // the dashboard online and the offline download, the way the onboarding leaves the device
    await page.goto('/app/dashboard', { waitUntil: 'networkidle' });
    await waitForServiceWorker(page);
    await downloadOfflinePages(page);
    const pages = [
      ['/app/chat', chatPreview.name, 'chat.chats'],
      ['/app/schedule', scheduleEntry.title, 'schedule.getScheduleEntries'],
      ['/app/emergency', emergencyCard.title, 'emergency.getEmergencyCards'],
    ] as const;
    // each page loaded in full, so each waits for its answer to be stored before the next one
    // replaces it; the app's own tab bar never unloads the page
    for (const [path, content, procedure] of pages) {
      await page.goto(path);
      await expect(page.getByText(content).first(), path).toBeVisible();
      await waitForPersisted(page, procedure);
    }

    const syntaxErrors: string[] = [];
    page.on('pageerror', (error) => {
      if (error.name === 'SyntaxError') syntaxErrors.push(error.message);
    });
    await context.setOffline(true);
    await cutTrpc(context);

    for (const [path, content] of pages) {
      await page.goto(path);
      await expect(page.getByText(content).first(), path).toBeVisible();
      await expect(page.getByText(ERROR_SCREEN), path).not.toBeVisible();
    }
    expect(syntaxErrors).toHaveLength(0);
  });
});
