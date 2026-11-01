import type { BrowserContext, Page } from '@playwright/test';
import { devices, expect } from '@playwright/test';
import superjson from 'superjson';

import type { RouterOutputs } from '@/trpc/client';

/**
 * What the offline specs serve in place of the server: one signed-in participant, a chat, a block
 * of the programme, a helper shift and an emergency card.
 *
 * Each value is checked against what its procedure returns, so a change to an answer's shape
 * fails the typecheck here. The copies these specs carried before had drifted until the pages
 * crashed on them (a programme entry without its timeslot), which looked like an offline bug.
 */

const emptyRichText = {
  root: {
    type: 'root',
    children: [],
    // eslint-disable-next-line unicorn/no-null -- the shape Payload stores and the type asks for
    direction: null,
    format: '' as const,
    indent: 0,
    version: 1,
  },
};

/** Noon of today in UTC, the way Payload stores a date. */
const todayAtNoon = (): string => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12),
  ).toISOString();
};

export const USER_ID = 'user-123';

/**
 * The user agent of the native app's WebView. The service worker keeps pages for offline use only
 * for the app; opened as a website, a page offline gets the "not available offline" screen.
 */
export const NATIVE_APP_USER_AGENT = `${devices['Desktop Chrome'].userAgent} Conveniat27App/1.0`;

export const scheduleEntry = {
  id: 'sched-1',
  title: 'Morning Camp Gathering',
  kind: 'program',
  description: emptyRichText,
  timeslot: { date: todayAtNoon(), time: '08:00 - 09:00' },
  // eslint-disable-next-line unicorn/no-null -- a block without a place, as Payload sends it
  location: null,
  organiser: [],
} satisfies RouterOutputs['schedule']['getScheduleEntries'][number];

export const helperShift = {
  id: 'shift-1',
  title: 'Küchenhilfe Mittagessen',
  description: 'Gemüse rüsten und abwaschen.',
  timeslot: { date: todayAtNoon(), time: '11:00 - 13:00' },
  organiser: [],
} satisfies RouterOutputs['schedule']['getHelperShifts'][number];

export const emergencyCard = {
  id: 'card-1',
  title: 'Erste Hilfe Karte',
  description: 'Bei Notfällen Ruhe bewahren.',
  procedure: emptyRichText,
  isExpandedByDefault: false,
  isNonMinifiable: false,
  documents: [],
  images: [],
} satisfies RouterOutputs['emergency']['getEmergencyCards'][number];

const alertSettings = {
  id: 'alert-settings',
  finalResponseMessage: 'Hilfe ist unterwegs.',
  emergencyPhoneNumber: '112',
} satisfies RouterOutputs['emergency']['getAlertSettings'];

export const chatMessage = {
  id: 'msg-1',
  createdAt: new Date(),
  messagePayload: 'Welcome to camp!',
  senderId: USER_ID,
  senderName: 'Test User',
  status: 'STORED',
  // a plain string to the type, `MessageType` of the Prisma schema to the chat view
  type: 'TEXT_MSG',
} satisfies RouterOutputs['chat']['infiniteMessages']['items'][number];

export const chatPreview = {
  id: 'chat-1',
  name: 'General Camp Chat',
  status: 'OPEN',
  chatType: 'GROUP',
  lastMessage: {
    id: chatMessage.id,
    senderId: USER_ID,
    senderName: 'Test User',
    messagePreview: 'Welcome to camp!',
    createdAt: chatMessage.createdAt,
    status: 'STORED',
  },
  lastUpdate: chatMessage.createdAt,
  unreadCount: 0,
  messageCount: 1,
  userChatPermission: 'MEMBER',
} satisfies RouterOutputs['chat']['chats'][number];

const chatDetails = {
  id: chatPreview.id,
  name: chatPreview.name,
  type: 'GROUP',
  status: 'OPEN',
  // eslint-disable-next-line unicorn/no-null -- not archived, as Prisma sends it
  archivedAt: null,
  messages: [chatMessage],
  participants: [{ id: USER_ID, name: 'Test User', isOnline: true, chatPermission: 'MEMBER' }],
  capabilities: ['CAN_SEND_MESSAGES'],
} satisfies RouterOutputs['chat']['chatDetails'];

/** Answers of every procedure the pages under test ask for; an empty list for the rest. */
const answers: Record<string, unknown> = {
  'chat.user': USER_ID,
  'chat.chats': [chatPreview],
  'chat.chatDetails': chatDetails,
  'chat.infiniteMessages': {
    items: [chatMessage],
    nextCursor: undefined,
  } satisfies RouterOutputs['chat']['infiniteMessages'],
  'emergency.getAlertSettings': alertSettings,
  'emergency.getEmergencyCards': [emergencyCard],
  'schedule.getScheduleEntries': [scheduleEntry],
  'schedule.getById': scheduleEntry satisfies RouterOutputs['schedule']['getById'],
  // no course behind the block: nobody enrolls in it
  // eslint-disable-next-line unicorn/no-null -- what the procedure answers for no course
  'schedule.getCourseStatus': null satisfies RouterOutputs['schedule']['getCourseStatus'],
  'schedule.getHelperShifts': [helperShift],
  'map.getMapAnnotations': {
    campMapAnnotationPoints: [],
    campMapAnnotationPolygons: [],
  } satisfies RouterOutputs['map']['getMapAnnotations'],
  'map.getAnnotations': { polygons: [] } satisfies RouterOutputs['map']['getAnnotations'],
  'presence.getPresence': {
    isPresent: true,
    isOutsideTrackingPeriod: false,
  },
};

/**
 * The tRPC answer for a request, as the server sends it: one result per procedure of the batch,
 * each encoded with superjson, so dates arrive as dates.
 */
export const trpcAnswer = (url: string): string => {
  const pathname = new URL(url).pathname;
  const procedures = (pathname.split('/api/trpc/')[1] ?? '').split(',');
  const results = procedures.map((procedure) => ({
    result: { data: superjson.serialize(procedure in answers ? answers[procedure] : []) },
  }));
  return JSON.stringify(procedures.length === 1 ? results[0] : results);
};

/**
 * Serves the signed-in session and the tRPC answers above. On the context, not the page: once the
 * service worker controls the page it makes these requests itself, and `page.route` never sees
 * them.
 */
export const mockAppBackend = async (context: BrowserContext): Promise<void> => {
  await context.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { name: 'Test User', email: 'test@cevi.ch', id: USER_ID },
        expires: new Date(Date.now() + 86_400_000).toISOString(),
      }),
    });
  });
  await context.route('**/api/trpc/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: trpcAnswer(route.request().url()),
    });
  });
};

/** Lets every tRPC request fail the way it does without a connection. */
export const cutTrpc = async (context: BrowserContext): Promise<void> => {
  await context.unroute('**/api/trpc/**');
  await context.route('**/api/trpc/**', async (route) => {
    await route.abort('internetdisconnected');
  });
};

/**
 * Waits until the service worker controls the page. Only then does it answer navigations from
 * its caches; a spec that went offline before that only tested the browser's own error page.
 */
export const waitForServiceWorker = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
    timeout: 30_000,
  });
};

/**
 * Waits until the persisted query cache holds an answer for each of the given procedures. The app
 * writes it at most once a second, and a full page load drops a write still waiting; a test that
 * leaves a page right after it showed its data may find nothing restored, where a phone kept open
 * a moment longer does.
 * @param page the page whose IndexedDB to read
 * @param procedures tRPC paths like `chat.chatDetails`
 */
export const waitForPersisted = async (page: Page, ...procedures: string[]): Promise<void> => {
  // polled from the test: `waitForFunction` does not wait for an async predicate, whose pending
  // promise already counts as true
  await expect
    .poll(
      () =>
        page.evaluate(async (expected) => {
          const raw = await new Promise<string>((resolve) => {
            const open = indexedDB.open('conveniat-db');
            open.addEventListener('error', () => resolve(''));
            open.addEventListener('success', () => {
              const database = open.result;
              if (!database.objectStoreNames.contains('keyval')) {
                database.close();
                resolve('');
                return;
              }
              const read = database
                .transaction('keyval')
                .objectStore('keyval')
                .get('conveniat-query-cache-idb');
              read.addEventListener('success', () => {
                database.close();
                resolve(typeof read.result === 'string' ? read.result : '');
              });
            });
          });
          if (raw === '') return expected;
          const persisted = JSON.parse(raw) as {
            json: { clientState: { queries: { queryHash: string; state: { data?: unknown } }[] } };
          };
          const answered = persisted.json.clientState.queries
            .filter((query) => query.state.data !== undefined && query.state.data !== null)
            .map((query) => query.queryHash);
          return expected.filter((procedure) => {
            const [router, name] = procedure.split('.');
            return !answered.some((hash) => hash.startsWith(`[["${router}","${name}"]`));
          });
        }, procedures),
      { message: 'the persisted query cache should hold these answers', timeout: 10_000 },
    )
    .toEqual([]);
};

/**
 * Runs the service worker's part of the offline download, the pages and assets, until it reports
 * that it is done.
 */
export const downloadOfflinePages = async (page: Page): Promise<void> => {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('the offline download never finished')),
          90_000,
        );
        navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
          if ((event.data as { type?: string } | null)?.type !== 'OFFLINE_DOWNLOAD_COMPLETE')
            return;
          clearTimeout(timer);
          resolve();
        });
        navigator.serviceWorker.controller?.postMessage({ type: 'START_OFFLINE_DOWNLOAD' });
      }),
  );
};
