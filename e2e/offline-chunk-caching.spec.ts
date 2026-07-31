import { expect, test } from '@playwright/test';

test.describe('Offline Static JS/CSS Chunk & Manifest Resilience', () => {
  test.beforeEach(async ({ page }) => {
    // Mock NextAuth session endpoint
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { name: 'Test User', email: 'test@cevi.ch', id: 'user-123' },
          expires: new Date(Date.now() + 86_400_000).toISOString(),
        }),
      });
    });

    // Mock tRPC procedures
    await page.route('**/api/trpc/**', async (route) => {
      const url = new URL(route.request().url());
      const pathname = url.pathname;
      const trpcMarker = '/api/trpc/';
      const markerIndex = pathname.indexOf(trpcMarker);
      const proceduresPart =
        markerIndex === -1 ? pathname : pathname.slice(markerIndex + trpcMarker.length);
      const procedures = proceduresPart.split(',');

      interface TrpcResult {
        result: {
          data: {
            json: unknown;
          };
        };
      }
      const response: TrpcResult[] = [];

      for (const proc of procedures) {
        switch (proc) {
          case 'chat.user': {
            response.push({ result: { data: { json: 'user-123' } } });
            break;
          }
          case 'chat.chats': {
            response.push({
              result: {
                data: {
                  json: [
                    {
                      id: 'chat-chunk-1',
                      name: 'Chunk Test Chat',
                      type: 'ONE_TO_ONE',
                      lastMessage: {
                        content: 'Chunk test content',
                        createdAt: new Date().toISOString(),
                      },
                    },
                  ],
                },
              },
            });
            break;
          }
          case 'emergency.getAlertSettings': {
            response.push({
              result: {
                data: {
                  json: {
                    emergencyPhoneNumber: '+41 79 000 00 00',
                    campsiteName: 'Cevi Camp',
                  },
                },
              },
            });
            break;
          }
          case 'emergency.getEmergencyCards': {
            response.push({
              result: {
                data: {
                  json: [
                    {
                      id: 'card-chunk-1',
                      title: 'First Aid Emergency Guide',
                      description: 'Instructions for emergency situations',
                    },
                  ],
                },
              },
            });
            break;
          }
          default: {
            response.push({ result: { data: { json: {} } } });
          }
        }
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  });

  test('should navigate to emergency page offline without ChunkLoadError or manifest failures', async ({
    page,
    context,
  }) => {
    // 1. Visit dashboard online
    await page.goto('/de/default/app/dashboard', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toBeVisible();

    // 2. Go offline before visiting /app/emergency
    await context.setOffline(true);

    // 3. Track console errors for ChunkLoadError
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    // 4. Navigate offline to /app/emergency
    await page.goto('/de/default/app/emergency', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    // 5. Verify no ChunkLoadError occurred
    const chunkErrors = consoleErrors.filter((errorString) =>
      errorString.includes('ChunkLoadError'),
    );
    expect(chunkErrors).toHaveLength(0);
  });
});
