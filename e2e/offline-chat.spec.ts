import type { BrowserContext, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import superjson from 'superjson';

import {
  chatMessage,
  chatPreview,
  mockAppBackend,
  NATIVE_APP_USER_AGENT,
  requireServiceWorkerRouting,
  USER_ID,
} from './fixtures/offline-app-data';
import { signIn } from './fixtures/sign-in';

test.use({ userAgent: NATIVE_APP_USER_AGENT });

type SendMessageMode = 'ok' | 'offline' | 'bad-gateway' | 'unauthenticated';

interface OfflineMessage {
  id: string;
  chatId: string;
  content: string;
  quotedMessageId?: string;
  parentId?: string;
  createdAt: string;
}

const OUTBOX_KEY = 'conveniat-offline-outbox';

/** The title of the clock on a message that waits in the outbox for a connection. */
const WAITING_FOR_CONNECTION = 'Wird gesendet, sobald du wieder online bist';

/**
 * Answers `chat.sendMessage` the way `backend.sendMessage` says, which a test changes while it
 * runs; everything else comes from the shared mock. Registered after it, so it is asked first.
 */
const mockSendMessage = async (
  context: BrowserContext,
  backend: { sendMessage: SendMessageMode },
): Promise<void> => {
  requireServiceWorkerRouting();
  await context.route('**/api/trpc/chat.sendMessage**', async (route) => {
    switch (backend.sendMessage) {
      case 'offline': {
        await route.abort('internetdisconnected');
        return;
      }
      case 'bad-gateway': {
        // what nginx answers while the app replica restarts
        await route.fulfill({
          status: 502,
          contentType: 'text/html',
          body: '<html><body><h1>502 Bad Gateway</h1><hr><center>nginx</center></body></html>',
        });
        return;
      }
      case 'unauthenticated': {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              error: {
                json: {
                  message: 'User not authenticated.',
                  code: -32_001,
                  data: { code: 'UNAUTHORIZED', httpStatus: 401, path: 'chat.sendMessage' },
                },
              },
            },
          ]),
        });
        return;
      }
      case 'ok': {
        const body = JSON.parse(route.request().postData() ?? '{}') as Record<
          string,
          { json?: { content?: string } }
        >;
        const content = Object.values(body)[0]?.json?.content ?? '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              result: {
                data: superjson.serialize({
                  id: `server-${Math.random().toString(36).slice(2)}`,
                  messagePayload: content,
                  createdAt: new Date(),
                  senderId: USER_ID,
                  senderName: 'Test User',
                  status: 'STORED',
                  type: 'TEXT_MSG',
                }),
              },
            },
          ]),
        });
        return;
      }
    }
  });
};

const readOutbox = async (page: Page): Promise<OfflineMessage[]> =>
  JSON.parse(
    (await page.evaluate((key) => localStorage.getItem(key), OUTBOX_KEY)) ?? '[]',
  ) as OfflineMessage[];

test.describe('Offline Chat Synchronization', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
    await mockAppBackend(context);
  });

  test('should support offline read, queued offline write and sequential synchronization', async ({
    page,
    context,
  }) => {
    const backend: { sendMessage: SendMessageMode } = { sendMessage: 'ok' };
    await mockSendMessage(context, backend);

    await page.goto(`/app/chat/${chatPreview.id}`);
    await expect(page.locator(`#message-${chatMessage.id}`)).toContainText(
      chatMessage.messagePayload,
    );

    // offline, a message is written and sent
    backend.sendMessage = 'offline';
    await context.setOffline(true);
    await page
      .getByRole('textbox', { name: `Nachricht an ${chatPreview.name}` })
      .fill('Hello while offline!');
    await page.getByRole('button', { name: 'Senden' }).click();

    // it shows at once, marked as waiting, and is kept in the outbox; the chat list beside it
    // previews the same text
    const sentMessage = page.locator('[id^="message-"]', { hasText: 'Hello while offline!' });
    await expect(sentMessage).toBeVisible();
    await expect(page.getByTitle(WAITING_FOR_CONNECTION)).toBeVisible();
    expect(await readOutbox(page)).toEqual([
      expect.objectContaining({ chatId: chatPreview.id, content: 'Hello while offline!' }),
    ]);

    // back online, the outbox is sent and emptied
    backend.sendMessage = 'ok';
    await context.setOffline(false);

    await expect(page.getByTitle(WAITING_FOR_CONNECTION)).not.toBeVisible();
    await expect.poll(() => readOutbox(page)).toEqual([]);
    await expect(sentMessage).toBeVisible();
  });

  test('keeps queued messages when the drain hits a 502 or an expired session', async ({
    page,
    context,
  }) => {
    const backend: { sendMessage: SendMessageMode } = { sendMessage: 'bad-gateway' };
    await mockSendMessage(context, backend);

    // a message written in the forest, waiting for the camp wifi
    await page.addInitScript(
      ({ key, chatId }) => {
        if (localStorage.getItem(key) !== null) return;
        localStorage.setItem(
          key,
          JSON.stringify([
            {
              type: 'MESSAGE',
              id: '0198f1c2-5b1e-7c3a-9d2e-4f6a8b0c1d2e',
              chatId,
              content: 'Wir sind beim Feuer',
              createdAt: new Date().toISOString(),
            },
          ]),
        );
      },
      { key: OUTBOX_KEY, chatId: chatPreview.id },
    );

    const failedDrain = (): Promise<unknown> =>
      page.waitForEvent('console', (message) =>
        message.text().includes('[Offline Sync] Failed to sync offline item'),
      );

    // 1. nginx answers with its HTML error page while the app restarts
    const badGatewayDrain = failedDrain();
    await page.goto(`/app/chat/${chatPreview.id}`);
    await badGatewayDrain;

    expect(await readOutbox(page)).toHaveLength(1);
    await expect(
      page.locator('[id^="message-"]', { hasText: 'Wir sind beim Feuer' }),
    ).toBeVisible();

    // 2. the session expired while the phone was offline: the client signs out and leaves
    backend.sendMessage = 'unauthenticated';
    // the first drain may still be winding down, and a reconnect that finds it busy starts
    // nothing, as on a phone; so the connection comes back until a drain runs
    let drained = false;
    const unauthenticatedDrain = failedDrain().then(() => {
      drained = true;
    });
    await expect(async () => {
      if (!drained) {
        await page.evaluate(() => {
          globalThis.dispatchEvent(new Event('online'));
        });
      }
      expect(drained).toBe(true);
    }).toPass({ intervals: [500], timeout: 15_000 });
    await unauthenticatedDrain;
    await page.waitForURL('**/entrypoint**');

    expect(await readOutbox(page)).toEqual([
      expect.objectContaining({ content: 'Wir sind beim Feuer' }),
    ]);
  });
});
