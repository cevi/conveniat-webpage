import { expect, test } from '@playwright/test';

test.describe('Offline Schedule Navigation & Detail View', () => {
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

    // 2. Mock tRPC responses
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
          case 'schedule.getScheduleEntries': {
            response.push({
              result: {
                data: {
                  json: [
                    {
                      id: 'sched-1',
                      title: 'Morning Camp Gathering',
                      description: 'Gathering at main square',
                      category: 'gathering',
                      enable_enrolment: false,
                      timeslot: {
                        day: '2026-07-31',
                        time: '09:00',
                      },
                      location: {
                        id: 'loc-1',
                        title: 'Hauptplatz',
                      },
                    },
                  ],
                },
              },
            });
            break;
          }
          case 'schedule.getById': {
            response.push({
              result: {
                data: {
                  json: {
                    id: 'sched-1',
                    title: 'Morning Camp Gathering',
                    description: 'Gathering at main square',
                    category: 'gathering',
                    enable_enrolment: false,
                    timeslot: {
                      day: '2026-07-31',
                      time: '09:00',
                    },
                    location: {
                      id: 'loc-1',
                      title: 'Hauptplatz',
                    },
                  },
                },
              },
            });
            break;
          }
          case 'schedule.getMyEnrollments':
          case 'schedule.getHelperShifts': {
            response.push({ result: { data: { json: [] } } });
            break;
          }
          case 'schedule.getCourseStatus': {
            response.push({
              result: {
                data: {
                  json: {
                    isAdmin: false,
                    isEnrolled: false,
                  },
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

  test('should load schedule page instantly offline and open schedule details when entry is clicked', async ({
    page,
    context,
  }) => {
    // 1. Visit schedule page online first to cache resources & populate IndexedDB / TanStack DB
    await page.goto('/app/schedule');
    await expect(page.getByText('Morning Camp Gathering')).toBeVisible();

    // Also visit dashboard online
    await page.goto('/app/dashboard');
    await expect(page.locator('body')).toBeVisible();

    // 2. Go offline AND unroute network mocks to simulate true offline network failures
    await page.unroute('**/api/trpc/**');
    await page.route('**/api/trpc/**', async (route) => {
      await route.abort('internetdisconnected');
    });
    await context.setOffline(true);

    // 3. Navigate from dashboard to schedule page while offline and measure duration
    const startTime = Date.now();
    await page.goto('/app/schedule');
    await expect(page.getByText('Morning Camp Gathering')).toBeVisible();
    const duration = Date.now() - startTime;

    // Navigation must be fast (< 2500ms) instead of taking ~45s or 15s
    expect(duration).toBeLessThan(2500);

    // 4. Click on the schedule item while offline to view details
    await page.getByText('Morning Camp Gathering').click();

    // 5. Verify that the schedule detail page opens and shows details
    await expect(page.getByText('Hauptplatz')).toBeVisible();
    expect(page.url()).toContain('/app/schedule/sched-1');
  });

  test('should render schedule detail page when directly navigating offline after downloading content during onboarding', async ({
    page,
    context,
  }) => {
    // 1. Visit onboarding entrypoint online (App Mode)
    await page.goto('/entrypoint?force-app-mode=true');
    await expect(page.locator('body')).toBeVisible();

    // 2. Trigger offline data sync (calls syncAllOfflineData & prefetchOfflinePages)
    await page.evaluate(() => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'START_OFFLINE_DOWNLOAD' });
      }
    });

    // Wait a brief moment for offline sync to complete
    await page.waitForTimeout(2000);

    // 3. Go offline AND block network requests
    await page.unroute('**/api/trpc/**');
    await page.route('**/api/trpc/**', async (route) => {
      await route.abort('internetdisconnected');
    });
    await context.setOffline(true);

    // 4. Directly navigate to schedule detail page while offline WITHOUT ever visiting it online
    await page.goto('/app/schedule/sched-1?date=2027-07-26');

    // 5. Verify schedule detail page renders details from cache
    await expect(page.getByText('Morning Camp Gathering')).toBeVisible();
  });
});
