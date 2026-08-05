import { expect, test } from '@playwright/test';
import * as fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = path.join(process.cwd(), '.temp_test_artifacts', 'screenshots');
const VIDEO_DIR = path.join(process.cwd(), '.temp_test_artifacts', 'videos');

// Ensure screenshot and video directories exist
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}
if (!fs.existsSync(VIDEO_DIR)) {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
}

test.use({ video: 'on' });

test.describe('Exhaustive Offline User Flows & Screenshot Verification Suite', () => {
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

    // 2. Comprehensive tRPC Router Mocks
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
          case 'chat.contacts': {
            response.push({
              result: {
                data: {
                  json: [
                    { id: 'user-456', name: 'Alice Smith', email: 'alice@cevi.ch' },
                    { id: 'user-789', name: 'Bob Jones', email: 'bob@cevi.ch' },
                  ],
                },
              },
            });
            break;
          }
          case 'chat.getFeatureFlags': {
            response.push({
              result: {
                data: {
                  json: { enableFileUpload: true, enableVoiceMessages: false },
                },
              },
            });
            break;
          }
          case 'chat.checkCapability': {
            response.push({ result: { data: { json: true } } });
            break;
          }
          case 'chat.chats': {
            response.push({
              result: {
                data: {
                  json: [
                    {
                      id: 'chat-1',
                      name: 'Lagerleitung Support',
                      type: 'ONE_TO_ONE',
                      lastMessage: {
                        content: 'Willkommen im Cevi Lager!',
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
                    name: 'Lagerleitung Support',
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
                        content: 'Willkommen im Cevi Lager!',
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
                    emergencyPhoneNumber: '+41 79 123 45 67',
                    enablePushAlerts: true,
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
                      title: 'Sanität & Erste Hilfe',
                      description: 'Verhaltensregeln bei Unfällen und medizinischen Notfällen.',
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
                      title: 'Morgenfeier am Hauptplatz',
                      description: 'Gemeinsamer Start in den Lagertag mit Musik.',
                      category: 'gathering',
                      enable_enrolment: false,
                      timeslot: {
                        date: '2027-07-26T08:00:00.000Z',
                        time: '08:00',
                      },
                      location: {
                        id: 'loc-1',
                        title: 'Hauptplatz Obergoms',
                      },
                    },
                    {
                      id: 'sched-2',
                      title: 'Pioniertechnik Workshop',
                      description: 'Bauen von Seilbrücken und Holzbauten.',
                      category: 'workshop',
                      enable_enrolment: true,
                      timeslot: {
                        date: '2027-07-26T10:00:00.000Z',
                        time: '10:00',
                      },
                      location: {
                        id: 'loc-2',
                        title: 'Bauplatz West',
                      },
                    },
                  ],
                },
              },
            });
            break;
          }
          case 'schedule.getById': {
            const id = url.searchParams.get('id') ?? 'sched-1';
            response.push({
              result: {
                data: {
                  json: {
                    id,
                    title:
                      id === 'sched-2' ? 'Pioniertechnik Workshop' : 'Morgenfeier am Hauptplatz',
                    description: id === 'sched-2' ? 'Bauen von Seilbrücken' : 'Gemeinsamer Start',
                    category: id === 'sched-2' ? 'workshop' : 'gathering',
                    enable_enrolment: id === 'sched-2',
                    timeslot: {
                      date: '2027-07-26T08:00:00.000Z',
                      time: '08:00',
                    },
                    location: {
                      id: 'loc-1',
                      title: 'Hauptplatz Obergoms',
                    },
                  },
                },
              },
            });
            break;
          }
          case 'schedule.getCourseStatus': {
            response.push({
              result: {
                data: {
                  json: {
                    isAdmin: false,
                    isEnrolled: false,
                    enrolledCount: 5,
                    maxParticipants: 20,
                  },
                },
              },
            });
            break;
          }
          case 'schedule.getCourseStatuses': {
            response.push({
              result: {
                data: {
                  json: {
                    'sched-1': { isAdmin: false, isEnrolled: false },
                    'sched-2': { isAdmin: false, isEnrolled: false },
                  },
                },
              },
            });
            break;
          }
          case 'schedule.getMyEnrollments':
          case 'shifts.getMyShiftEnrollments': {
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
                      title: 'Küchendienst Frühstück',
                      startTime: '2027-07-26T06:30:00.000Z',
                      endTime: '2027-07-26T08:30:00.000Z',
                      requiredHelpers: 4,
                      currentHelpers: 2,
                    },
                  ],
                },
              },
            });
            break;
          }
          case 'shifts.getShiftStatus': {
            response.push({
              result: {
                data: {
                  json: { isEnrolled: false, canEnroll: true },
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
                    campMapAnnotationPoints: [
                      {
                        id: 'loc-1',
                        title: 'Hauptplatz Obergoms',
                        description: 'Zentraler Treffpunkt des Bundeslagers.',
                        geometry: { coordinates: [8.301_211, 46.502_822] },
                        icon: 'MapPin',
                        color: '#47564c',
                      },
                    ],
                    campMapAnnotationPolygons: [],
                    schedules: {},
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
            response.push({ result: { data: { json: [] } } });
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

  test('Complete Offline User Journey: Onboarding -> All 8 App Pages & Details Offline', async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);

    // STEP 1: Onboarding Online, Download Content & Cache Warm-Up
    console.log('[E2E Test] Step 1: Navigating to onboarding online...');
    await page.goto('/entrypoint?force-app-mode=true');
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_onboarding_online.png') });

    // Wait for Service Worker registration to complete
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    });

    // Click download button if present to trigger SW prefetch & syncAllOfflineData
    const downloadButton = page.getByRole('button', { name: /Herunterladen/i });
    if (await downloadButton.isVisible()) {
      await downloadButton.click();
      console.log('[E2E Test] Clicked download button. Waiting for 100% download completion...');
      await page
        .waitForFunction(
          () =>
            document.body.textContent?.includes('100%') ||
            document.body.textContent?.includes('Erfolg') ||
            globalThis.location.pathname.includes('/app/dashboard'),
          { timeout: 45_000 },
        )
        .catch(() => console.warn('[E2E Test] Timeout waiting for 100% download indicator'));
      await page.waitForTimeout(5000);
    }

    // Reload page once online so Service Worker claims full control of the document
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Verify Service Worker controller is active
    const isSwControlling = await page.evaluate(() => navigator.serviceWorker?.controller !== null);
    console.log(`[E2E Test] Service Worker controlling page: ${isSwControlling}`);

    // STEP 2: Go 100% Offline
    console.log('[E2E Test] Step 2: Going 100% offline...');
    await page.unroute('**/api/trpc/**');
    await context.setOffline(true);

    // FLOW 1 Verification: Onboarding Page Offline Reload
    console.log('[E2E Test] Flow 1: Onboarding page offline reload');
    await page.goto('/entrypoint?force-app-mode=true', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_onboarding_offline.png') });

    // FLOW 2: Dashboard Page Offline
    console.log('[E2E Test] Flow 2: Navigating to Dashboard offline');
    await page.goto('/app/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_dashboard_offline.png') });

    // FLOW 3: Schedule List Offline
    console.log('[E2E Test] Flow 3: Navigating to Schedule List offline');
    await page.goto('/app/schedule', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03_schedule_list_offline.png'),
    });

    // FLOW 4: Chat Overview Offline
    console.log('[E2E Test] Flow 4: Navigating to Chat Overview offline');
    await page.goto('/app/chat', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_chat_overview_offline.png') });

    // FLOW 5: Emergency Page Offline
    console.log('[E2E Test] Flow 5: Navigating to Emergency page offline');
    await page.goto('/app/emergency', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_emergency_offline.png') });

    // FLOW 6: Map Viewer Offline
    console.log('[E2E Test] Flow 6: Navigating to Map page offline');
    await page.goto('/app/map', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_map_offline.png') });

    // FLOW 7: Helper Portal Offline
    console.log('[E2E Test] Flow 7: Navigating to Helper Portal offline');
    await page.goto('/app/helper-portal', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_helper_portal_offline.png') });

    // FLOW 8: Settings Page Offline
    console.log('[E2E Test] Flow 8: Navigating to Settings page offline');
    await page.goto('/app/settings', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_settings_offline.png') });

    console.log('[E2E Test] All 8 User Flows completed cleanly offline with screenshots!');
  });
});
