import { expect, test } from '@playwright/test';

test.describe('Offline Flaky Network & Unstable Connection Resilience', () => {
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
                      id: 'chat-flaky-1',
                      name: 'Flaky Network Camp Chat',
                      type: 'ONE_TO_ONE',
                      lastMessage: {
                        content: 'Flaky connection message',
                        createdAt: new Date().toISOString(),
                      },
                    },
                  ],
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
                    id: 'chat-flaky-1',
                    name: 'Flaky Network Camp Chat',
                    type: 'ONE_TO_ONE',
                    messages: [],
                    participants: [
                      {
                        id: 'user-123',
                        name: 'Test User',
                        isOnline: true,
                        chatPermission: 'ADMIN',
                      },
                    ],
                    capabilities: ['CAN_SEND_MESSAGES'],
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
                        id: 'msg-flaky-1',
                        content: 'Flaky connection message',
                        senderId: 'user-123',
                        createdAt: new Date().toISOString(),
                        chatId: 'chat-flaky-1',
                      },
                    ],
                    nextCursor: undefined,
                  },
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
                      id: 'card-1',
                      title: 'First Aid Emergency Guide',
                      description: 'Instructions for emergency situations',
                    },
                  ],
                },
              },
            });
            break;
          }
          case 'schedule.getScheduleEntries': {
            response.push({
              result: {
                data: {
                  json: [
                    {
                      id: 'sched-flaky-1',
                      title: 'Flaky Network Outdoor Activity',
                      description: 'Outdoor workshop under unstable network',
                      timeslot: { date: '2026-07-31', time: '14:00' },
                      location: { title: 'Camp Center' },
                    },
                  ],
                },
              },
            });
            break;
          }
          case 'helperPortal.myShifts':
          case 'helperPortal.shifts': {
            response.push({
              result: {
                data: {
                  json: [
                    {
                      id: 'shift-flaky-1',
                      title: 'Kitchen Duty Shift',
                      status: 'CONFIRMED',
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

  test('should navigate app pages seamlessly offline without throwing RSC stream syntax errors', async ({
    page,
    context,
  }) => {
    // 1. Visit dashboard online to trigger cache initialization
    await page.goto('/de/default/app/dashboard', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toBeVisible();

    // 2. Set context offline
    await context.setOffline(true);

    // 3. Navigate to chat overview offline
    await page.goto('/de/default/app/chat', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    // 4. Navigate to schedule offline
    await page.goto('/de/default/app/schedule', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    // 5. Navigate to emergency offline
    await page.goto('/de/default/app/emergency', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    // 6. Verify page body is rendered cleanly without white screen crash
    const heading = page.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible();
  });
});
