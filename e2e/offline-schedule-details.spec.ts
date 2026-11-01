import { expect, test } from '@playwright/test';

import {
  cutTrpc,
  downloadOfflinePages,
  mockAppBackend,
  NATIVE_APP_USER_AGENT,
  scheduleEntry,
  waitForPersisted,
  waitForServiceWorker,
} from './fixtures/offline-app-data';
import { signIn } from './fixtures/sign-in';

test.use({ userAgent: NATIVE_APP_USER_AGENT });

test.describe('Offline Schedule Details', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
    await mockAppBackend(context);
  });

  test('should load schedule page instantly offline and open schedule details when entry is clicked', async ({
    page,
    context,
  }) => {
    await page.goto('/app/schedule');
    await waitForServiceWorker(page);
    // once more with the worker in control, which keeps the page for offline use
    await page.goto('/app/schedule');
    await expect(page.getByText(scheduleEntry.title)).toBeVisible();
    await page.goto('/app/dashboard');
    await waitForPersisted(page, 'schedule.getScheduleEntries');

    await context.setOffline(true);
    await cutTrpc(context);

    const startTime = Date.now();
    await page.goto('/app/schedule');
    await expect(page.getByText(scheduleEntry.title)).toBeVisible();
    // from the device's copies, not after a network timeout
    expect(Date.now() - startTime).toBeLessThan(2500);

    await page.getByText(scheduleEntry.title).click();

    await expect(page.getByRole('heading', { level: 1, name: scheduleEntry.title })).toBeVisible();
    expect(new URL(page.url()).searchParams.get('id')).toBe(scheduleEntry.id);
  });

  test('should render schedule detail page when directly navigating offline after downloading content during onboarding', async ({
    page,
    context,
  }) => {
    // what the onboarding's download leaves on the device: the programme in the query cache and
    // the app's pages in the worker's; the block's own page was never opened
    await page.goto('/app/dashboard');
    await waitForServiceWorker(page);
    await waitForPersisted(page, 'schedule.getScheduleEntries');
    await downloadOfflinePages(page);

    await context.setOffline(true);
    await cutTrpc(context);

    await page.goto(`/app/schedule/${scheduleEntry.id}`);

    await expect(page.getByRole('heading', { level: 1, name: scheduleEntry.title })).toBeVisible();
  });
});
