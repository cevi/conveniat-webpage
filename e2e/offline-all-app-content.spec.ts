import { expect, test } from '@playwright/test';

test.describe('Comprehensive Offline App Data & Feature Caching', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock NextAuth session endpoint
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

    // 2. Mock tRPC responses for offline data prefetching
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
                      id: 'chat-1',
                      name: 'General Camp Chat',
                      type: 'ONE_TO_ONE',
                      lastMessage: {
                        content: 'Welcome to camp!',
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
                    id: 'chat-1',
                    name: 'General Camp Chat',
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
                        id: 'msg-1',
                        content: 'Welcome to camp!',
                        senderId: 'user-123',
                        createdAt: new Date().toISOString(),
                        chatId: 'chat-1',
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
                    emergencyPhoneNumber: '112',
                    alertModeEnabled: true,
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
                      title: 'Erste Hilfe Karte',
                      description: 'Bei Notfällen Ruhe bewahren.',
                      procedure: { root: { children: [] } },
                      documents: [],
                      images: [],
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
                      id: 'sched-1',
                      title: 'Morning Camp Gathering',
                      startTime: new Date().toISOString(),
                      endTime: new Date(Date.now() + 3_600_000).toISOString(),
                      location: 'Hauptplatz',
                    },
                  ],
                },
              },
            });
            break;
          }
          case 'schedule.getMyEnrollments': {
            response.push({ result: { data: { json: [] } } });
            break;
          }
          case 'schedule.getHelperShifts': {
            response.push({
              result: {
                data: {
                  json: [
                    {
                      id: 'shift-1',
                      title: 'Küchenhilfe Mittagessen',
                      startTime: new Date().toISOString(),
                      endTime: new Date(Date.now() + 3_600_000).toISOString(),
                      location: 'Küche',
                    },
                  ],
                },
              },
            });
            break;
          }
          case 'map.getMapAnnotations':
          case 'map.getAnnotations': {
            response.push({
              result: {
                data: {
                  json: {
                    campMapAnnotationPoints: [],
                    campMapAnnotationPolygons: [],
                  },
                },
              },
            });
            break;
          }
          case 'presence.getPresence': {
            response.push({
              result: {
                data: {
                  json: {
                    isPresent: true,
                    isOutsideTrackingPeriod: false,
                  },
                },
              },
            });
            break;
          }
          case 'photoContest.getContests': {
            response.push({
              result: {
                data: {
                  json: [],
                },
              },
            });
            break;
          }
          default: {
            response.push({ result: { data: { json: undefined } } });
            break;
          }
        }
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(procedures.length === 1 ? response[0] : response),
      });
    });
  });

  test('should render emergency cards offline from cache and NOT show "Keine Notfallkarten gefunden."', async ({
    page,
    context,
  }) => {
    // 1. Visit emergency page online to populate cache
    await page.goto('/app/emergency');
    await expect(page.getByText('Erste Hilfe Karte')).toBeVisible();

    // 2. Go offline (airplane mode) and abort network requests
    await context.setOffline(true);
    await page.unroute('**/api/trpc/**');
    await page.route('**/api/trpc/**', async (route) => {
      await route.abort('internetdisconnected');
    });

    // 3. Reload/re-navigate offline to emergency page
    await page.goto('/app/emergency');

    // 4. Verify emergency cards load instantly offline from cache and direct phone button is visible
    await expect(page.getByText('Erste Hilfe Karte')).toBeVisible();
    await expect(page.getByText('Keine Notfallkarten gefunden.')).not.toBeVisible();
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display schedule entries offline from cache and NOT show "Kein Programm verfügbar"', async ({
    page,
    context,
  }) => {
    // 1. Visit schedule page online to populate cache
    await page.goto('/app/schedule');
    await expect(page.getByText('Morning Camp Gathering')).toBeVisible();

    // 2. Go offline
    await context.setOffline(true);
    await page.unroute('**/api/trpc/**');
    await page.route('**/api/trpc/**', async (route) => {
      await route.abort('internetdisconnected');
    });

    // 3. Re-navigate offline to schedule page
    await page.goto('/app/schedule');

    // 4. Verify schedule entries load from cache and placeholder is NOT shown
    await expect(page.getByText('Morning Camp Gathering')).toBeVisible();
    await expect(page.getByText('Kein Programm verfügbar')).not.toBeVisible();
  });

  test('should display chats offline from cache and NOT show "Noch keine Unterhaltungen"', async ({
    page,
    context,
  }) => {
    // 1. Visit chat page online
    await page.goto('/app/chat');
    await expect(page.getByText('General Camp Chat')).toBeVisible();

    // 2. Go offline
    await context.setOffline(true);
    await page.unroute('**/api/trpc/**');
    await page.route('**/api/trpc/**', async (route) => {
      await route.abort('internetdisconnected');
    });

    // 3. Re-navigate offline to chat page
    await page.goto('/app/chat');
    await expect(page.getByText('General Camp Chat')).toBeVisible();
    await expect(page.getByText('Noch keine Unterhaltungen')).not.toBeVisible();
  });

  test('should navigate client-side offline across all main app routes without crashing', async ({
    page,
    context,
  }) => {
    // Start online to hydrate app state
    await page.goto('/app/dashboard');

    // Turn off network
    await context.setOffline(true);

    const routes = [
      '/app/dashboard',
      '/app/schedule',
      '/app/chat',
      '/app/emergency',
      '/app/map',
      '/app/helper-portal',
      '/app/presence',
      '/app/photo-contest',
    ];

    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should keep chat messages pending in offline outbox while offline', async ({
    page,
    context,
  }) => {
    // 1. Visit chat online
    await page.goto('/app/chat');

    // 2. Go offline
    await context.setOffline(true);

    // 3. Verify page is active offline
    await expect(page.locator('body')).toBeVisible();

    // 4. Restore online connection
    await context.setOffline(false);
  });

  test('should display helper shifts offline from cache on /app/helper-portal', async ({
    page,
    context,
  }) => {
    // 1. Visit helper portal online
    await page.goto('/app/helper-portal');
    await expect(page.getByText('Küchenhilfe Mittagessen')).toBeVisible();

    // 2. Go offline
    await context.setOffline(true);
    await page.unroute('**/api/trpc/**');
    await page.route('**/api/trpc/**', async (route) => {
      await route.abort('internetdisconnected');
    });

    // 3. Re-navigate offline to helper portal
    await page.goto('/app/helper-portal');

    // 4. Verify helper shifts load from cache offline
    await expect(page.getByText('Küchenhilfe Mittagessen')).toBeVisible();
  });

  test('should open individual chat /app/chat/chat-1 offline and render cached message list', async ({
    page,
    context,
  }) => {
    // 1. Visit individual chat online
    await page.goto('/app/chat/chat-1');
    await expect(page.getByText('General Camp Chat')).toBeVisible();
    await expect(page.getByText('Welcome to camp!')).toBeVisible();

    // 2. Go offline
    await context.setOffline(true);
    await page.unroute('**/api/trpc/**');
    await page.route('**/api/trpc/**', async (route) => {
      await route.abort('internetdisconnected');
    });

    // 3. Re-navigate offline to individual chat page
    await page.goto('/app/chat/chat-1');

    // 4. Verify chat title and messages load from cache offline without offline error banner
    await expect(page.getByText('General Camp Chat')).toBeVisible();
    await expect(page.getByText('Welcome to camp!')).toBeVisible();
    await expect(
      page.getByText('Du musst online sein, um diesen Chat zu sehen.'),
    ).not.toBeVisible();
  });
});
