import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

type SendMessageMode = 'ok' | 'offline' | 'bad-gateway' | 'unauthenticated';

interface OfflineMessage {
  id: string;
  chatId: string;
  content: string;
  quotedMessageId?: string;
  parentId?: string;
  createdAt: string;
}

/**
 * Answers the session and every tRPC call the chat view makes. `backend.sendMessage` decides
 * how a send is answered, and can be changed while the test runs.
 */
const mockChatBackend = async (
  page: Page,
  backend: { sendMessage: SendMessageMode },
): Promise<void> => {
  let lastSentContent = '';

  // Mock next-auth session call to bypass authentication check client-side
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          name: 'User 123',
          email: 'user123@cevi.ch',
          image: undefined,
        },
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      }),
    });
  });

  // Mock tRPC calls
  await page.route('**/api/trpc/**', async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    const method = route.request().method();

    // Extract the procedure names (handles batching, e.g. /api/trpc/proc1,proc2)
    const trpcMarker = '/api/trpc/';
    const markerIndex = pathname.indexOf(trpcMarker);
    const proceduresPart =
      markerIndex === -1 ? pathname : pathname.slice(markerIndex + trpcMarker.length);
    const procedures = proceduresPart.split(',');

    if (procedures.includes('chat.sendMessage')) {
      if (backend.sendMessage === 'offline') {
        await route.abort('internetdisconnected');
        return;
      }
      if (backend.sendMessage === 'bad-gateway') {
        // what nginx answers while the app replica restarts
        await route.fulfill({
          status: 502,
          contentType: 'text/html',
          body: '<html><body><h1>502 Bad Gateway</h1><hr><center>nginx</center></body></html>',
        });
        return;
      }
      if (backend.sendMessage === 'unauthenticated') {
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
    }

    // Prepare response for each procedure in the batch
    interface TrpcResponse {
      result: {
        data: {
          json: unknown;
        };
      };
    }
    const response: TrpcResponse[] = [];
    for (const proc of procedures) {
      switch (proc) {
        case 'chat.user': {
          response.push({
            result: {
              data: {
                json: 'user-123',
              },
            },
          });
          break;
        }
        case 'chat.chatDetails': {
          response.push({
            result: {
              data: {
                json: {
                  id: 'test-chat-id',
                  name: 'Test Chat',
                  type: 'ONE_TO_ONE',
                  // eslint-disable-next-line unicorn/no-null
                  archivedAt: null,
                  messages: [],
                  participants: [
                    { id: 'user-123', name: 'User 123', isOnline: true, chatPermission: 'ADMIN' },
                    {
                      id: 'user-456',
                      name: 'User 456',
                      isOnline: true,
                      chatPermission: 'MEMBER',
                    },
                  ],
                  capabilities: ['CAN_SEND_MESSAGES', 'THREADS', 'THREAD_REPLIES'],
                },
              },
            },
          });
          break;
        }
        case 'chat.infiniteMessages': {
          response.push({
            result: {
              data: {
                json: {
                  items: [
                    {
                      id: 'msg-1',
                      messagePayload: { text: 'Hello, this is a cached message.' },
                      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
                      senderId: 'user-456',
                      senderName: 'User 456',
                      status: 'STORED',
                      type: 'TEXT_MSG',
                    },
                  ],
                  nextCursor: undefined,
                },
              },
            },
          });
          break;
        }
        case 'chat.chats': {
          response.push({
            result: {
              data: {
                json: [
                  {
                    id: 'test-chat-id',
                    name: 'Test Chat',
                    type: 'ONE_TO_ONE',
                    lastMessage: {
                      id: 'msg-1',
                      senderId: 'user-456',
                      messagePreview: 'Hello, this is a cached message.',
                      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                      status: 'STORED',
                      type: 'TEXT_MSG',
                    },
                    lastUpdate: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                    unreadCount: 0,
                  },
                ],
              },
            },
          });
          break;
        }
        case 'chat.sendMessage': {
          if (method === 'POST') {
            const postData = route.request().postData();
            if (postData) {
              try {
                interface TrpcPostPayload {
                  [key: string]: {
                    json: {
                      content?: string;
                    };
                  };
                }
                const parsed = JSON.parse(postData) as TrpcPostPayload;
                // tRPC batch body format: { "0": { "json": { "content": "..." } } }
                const batchKey = Object.keys(parsed)[0];
                if (batchKey !== undefined) {
                  const content = parsed[batchKey]?.json?.content || 'Hello from offline outbox!';
                  lastSentContent = content;
                }
              } catch (error) {
                console.error('Failed to parse post data in mock:', error);
              }
            }
          }

          response.push({
            result: {
              data: {
                json: {
                  id: 'server-msg-id-' + Math.random().toString(36).slice(7),
                  messagePayload: {
                    text: lastSentContent || 'Offline message sent successfully!',
                  },
                  createdAt: new Date().toISOString(),
                  senderId: 'user-123',
                  senderName: 'User 123',
                  status: 'STORED',
                  type: 'TEXT_MSG',
                },
              },
            },
          });
          break;
        }
        case 'chat.getMessage': {
          response.push({
            result: {
              data: {
                json: {
                  id: 'msg-1',
                  messagePayload: { text: 'Hello, this is a cached message.' },
                  createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                  senderId: 'user-456',
                  senderName: 'User 456',
                  status: 'STORED',
                  type: 'TEXT_MSG',
                },
              },
            },
          });
          break;
        }
        default: {
          response.push({
            result: {
              data: {
                json: undefined,
              },
            },
          });
          break;
        }
      }
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
};

const readOutbox = async (page: Page): Promise<OfflineMessage[]> =>
  JSON.parse(
    (await page.evaluate(() => localStorage.getItem('conveniat-offline-outbox'))) ?? '[]',
  ) as OfflineMessage[];

test.describe('Offline Chat Synchronization', () => {
  test('should support offline read, queued offline write and sequential synchronization', async ({
    page,
    context,
  }) => {
    const backend: { sendMessage: SendMessageMode } = { sendMessage: 'ok' };
    await mockChatBackend(page, backend);

    // 1. Load the page while online, verify it loads cached messages
    await page.goto('/de/app/chat/test-chat-id?app-mode=true');

    // Wait for the message list and verify the mock cached message is displayed
    const messageContainer = page.locator('id=message-msg-1');
    await expect(messageContainer).toBeVisible();
    await expect(page.locator('text=Hello, this is a cached message.')).toBeVisible();

    // 2. Go offline
    backend.sendMessage = 'offline';
    await context.setOffline(true);

    // Enter a new message in the input area
    const textarea = page.locator('textarea[placeholder="Nachricht eingeben..."]');
    await expect(textarea).toBeVisible();
    await textarea.fill('Hello while offline!');

    // Click the send button
    const sendButton = page.locator('button:has(svg.lucide-send)');
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    // Assert that the message appears immediately in the UI (optimistic update)
    const optimisticMessage = page.locator('text=Hello while offline!');
    await expect(optimisticMessage).toBeVisible();

    // The message should have the grey spinner indicator (`svg.animate-spin`) since status is MessageEventType.CREATED
    const spinner = page.locator('svg.animate-spin');
    await expect(spinner).toBeVisible();

    // Assert that the message has been written to localStorage under 'conveniat-offline-outbox'
    const outboxRaw = await page.evaluate(() => localStorage.getItem('conveniat-offline-outbox'));
    expect(outboxRaw).not.toBeNull();
    const outbox = JSON.parse(outboxRaw || '[]') as OfflineMessage[];
    expect(outbox.length).toBe(1);
    expect(outbox[0]?.content).toBe('Hello while offline!');

    // 3. Go back online
    backend.sendMessage = 'ok';
    await context.setOffline(false);

    // Trigger the online event on the page to wake up the OfflineQueueSync processor
    await page.evaluate(() => {
      globalThis.dispatchEvent(new Event('online'));
    });

    // Assert that the queue processor synchronizes the message:
    // - The grey spinner should disappear
    // - The outbox in localStorage should be emptied
    await expect(spinner).not.toBeVisible();

    // Wait and check localStorage outbox is empty
    await expect
      .poll(async () => {
        const currentOutboxRaw = await page.evaluate(() =>
          localStorage.getItem('conveniat-offline-outbox'),
        );
        const currentOutbox = JSON.parse(currentOutboxRaw || '[]') as OfflineMessage[];
        return currentOutbox.length;
      })
      .toBe(0);

    // Assert the message text is still visible and has transitioned to sent status
    await expect(page.locator('text=Hello while offline!')).toBeVisible();
  });
  test('keeps queued messages when the drain hits a 502 or an expired session', async ({
    page,
  }) => {
    const backend: { sendMessage: SendMessageMode } = { sendMessage: 'bad-gateway' };
    await mockChatBackend(page, backend);

    // a message written in the forest, waiting for the camp wifi
    await page.addInitScript(() => {
      if (localStorage.getItem('conveniat-offline-outbox') !== null) return;
      localStorage.setItem(
        'conveniat-offline-outbox',
        JSON.stringify([
          {
            type: 'MESSAGE',
            id: '0198f1c2-5b1e-7c3a-9d2e-4f6a8b0c1d2e',
            chatId: 'test-chat-id',
            content: 'Wir sind beim Feuer',
            createdAt: new Date().toISOString(),
          },
        ]),
      );
    });

    const failedDrain = (): Promise<unknown> =>
      page.waitForEvent('console', (message) =>
        message.text().includes('[Offline Sync] Failed to sync offline item'),
      );

    // 1. nginx answers with its HTML error page while the app restarts
    const badGatewayDrain = failedDrain();
    await page.goto('/de/app/chat/test-chat-id?app-mode=true');
    await badGatewayDrain;

    expect(await readOutbox(page)).toHaveLength(1);
    await expect(page.locator('text=Wir sind beim Feuer')).toBeVisible();

    // 2. the session expired while the phone was offline: the client signs out and leaves
    backend.sendMessage = 'unauthenticated';
    const unauthenticatedDrain = failedDrain();
    await page.evaluate(() => {
      globalThis.dispatchEvent(new Event('online'));
    });
    await unauthenticatedDrain;
    await page.waitForURL('**/entrypoint**');

    expect(await readOutbox(page)).toEqual([
      expect.objectContaining({ content: 'Wir sind beim Feuer' }),
    ]);
  });
});
