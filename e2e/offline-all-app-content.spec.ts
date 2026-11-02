import type { BrowserContext, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  chatMessage,
  chatPreview,
  cutTrpc,
  emergencyCard,
  helperShift,
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

/**
 * Airplane mode after a visit: the service worker controls the page and has kept a copy of it,
 * the browser has no network, and every tRPC request fails. The very first load happens before
 * the worker controls the page, so it is loaded once more for the worker to see and keep.
 */
const goOffline = async (
  page: Page,
  context: BrowserContext,
  ...persistedProcedures: string[]
): Promise<void> => {
  await waitForServiceWorker(page);
  await page.reload({ waitUntil: 'networkidle' });
  if (persistedProcedures.length > 0) await waitForPersisted(page, ...persistedProcedures);
  await context.setOffline(true);
  await cutTrpc(context);
};

test.describe('Comprehensive Offline App Data & Feature Caching', () => {
  // the chat checks the session on the server too, which a mocked session does not reach
  test.beforeEach(async ({ context }) => {
    await signIn(context);
    await mockAppBackend(context);
  });

  test('should render emergency cards offline from cache and NOT show "Keine Notfallkarten gefunden."', async ({
    page,
    context,
  }) => {
    await page.goto('/app/emergency');
    await expect(page.getByText(emergencyCard.title)).toBeVisible();

    await goOffline(page, context, 'emergency.getEmergencyCards');
    await page.goto('/app/emergency');

    await expect(page.getByText(emergencyCard.title)).toBeVisible();
    await expect(page.getByText('Keine Notfallkarten gefunden.')).not.toBeVisible();
  });

  test('should display schedule entries offline from cache and NOT show "Kein Programm verfügbar"', async ({
    page,
    context,
  }) => {
    await page.goto('/app/schedule');
    // the list entry: on a wide screen the open block's page shows the title as well
    await expect(page.getByRole('link', { name: scheduleEntry.title })).toBeVisible();

    await goOffline(page, context, 'schedule.getScheduleEntries');
    await page.goto('/app/schedule');

    await expect(page.getByRole('link', { name: scheduleEntry.title })).toBeVisible();
    await expect(page.getByText('Kein Programm verfügbar')).not.toBeVisible();
  });

  test('should display chats offline from cache and NOT show "Noch keine Unterhaltungen"', async ({
    page,
    context,
  }) => {
    await page.goto('/app/chat');
    await expect(page.getByText(chatPreview.name)).toBeVisible();

    await goOffline(page, context, 'chat.chats');
    await page.goto('/app/chat');

    await expect(page.getByText(chatPreview.name)).toBeVisible();
    await expect(page.getByText('Noch keine Unterhaltungen')).not.toBeVisible();
  });

  test('should open every main app page offline without crashing', async ({ page, context }) => {
    await page.goto('/app/dashboard');
    await goOffline(page, context);

    for (const route of [
      '/app/dashboard',
      '/app/schedule',
      '/app/chat',
      '/app/emergency',
      '/app/map',
      '/app/helper-portal',
      '/app/photo-contest',
    ]) {
      await page.goto(route);
      await expect(page.getByText(ERROR_SCREEN), route).not.toBeVisible();
    }
  });

  test('should display helper shifts offline from cache on /app/helper-portal', async ({
    page,
    context,
  }) => {
    await page.goto('/app/helper-portal');
    await expect(page.getByText(helperShift.title)).toBeVisible();

    await goOffline(page, context, 'schedule.getHelperShifts');
    await page.goto('/app/helper-portal');

    await expect(page.getByText(helperShift.title)).toBeVisible();
  });

  test('should open an individual chat offline and render its cached messages', async ({
    page,
    context,
  }) => {
    // the open chat's header; the chat list beside it names the chat as well
    const header = page.getByRole('link', { name: `${chatPreview.name}, Chat-Details öffnen` });
    const message = page.locator(`#message-${chatMessage.id}`);

    await page.goto(`/app/chat/${chatPreview.id}`);
    await expect(header).toBeVisible();
    await expect(message).toContainText(chatMessage.messagePayload);

    await goOffline(page, context, 'chat.chatDetails', 'chat.infiniteMessages');
    await page.goto(`/app/chat/${chatPreview.id}`);

    await expect(header).toBeVisible();
    await expect(message).toContainText(chatMessage.messagePayload);
    await expect(
      page.getByText('Du musst online sein, um diesen Chat zu sehen.'),
    ).not.toBeVisible();
  });
});
