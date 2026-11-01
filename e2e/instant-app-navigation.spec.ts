import { instant } from '@next/playwright';
import type { BrowserContext, Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/**
 * The app's main navigations are instant: a tap shows the destination from what the router
 * prefetched, before the server answers anything for that tap.
 *
 * `instant()` holds back every dynamic server response, and every `fetch` of the page, until its
 * callback returns. So inside it the destination can only show what the router prefetched and
 * what the persisted query cache already holds — exactly what a user on camp wifi sees at the
 * moment of the tap. Each test clicks one real link and asserts what is on screen inside the
 * lock, then that the rest arrives once it is released.
 *
 * Runs against a production build with the testing API exposed, signed in through the fake
 * Cevi.DB OAuth server; see instant-nav.rig.md for how to build and start it.
 */

// the router's prefetching is what is under test, not the service worker's copies; a navigation
// that cannot commit from what was prefetched fails at the URL instead of hanging in the lock
test.use({
  serviceWorkers: 'block',
  viewport: { width: 390, height: 844 },
  navigationTimeout: 15_000,
});

/** One pass through the fake Cevi.DB OAuth login, as a camp participant without extra rights. */
const attemptSignIn = async (context: BrowserContext): Promise<boolean> => {
  const { request } = context;
  const csrfResponse = await request.get('/api/auth/csrf');
  const csrf = (await csrfResponse.json()) as { csrfToken: string };

  const start = await request.post('/api/auth/signin/cevi-db', {
    form: { csrfToken: csrf.csrfToken, callbackUrl: '/app/dashboard' },
    maxRedirects: 0,
  });
  const callbackUrl = new URL(start.headers()['location'] ?? '').searchParams.get('redirect_uri');
  expect(callbackUrl, 'the sign-in should redirect to the Cevi.DB login').toBeTruthy();
  await request.get(`${callbackUrl}?code=fake-auth-code-3`, { maxRedirects: 0 });

  const sessionResponse = await request.get('/api/auth/session');
  const session = (await sessionResponse.json()) as { user?: unknown } | null;
  return Boolean(session?.user);
};

/** The text of an element, without the whitespace around it. */
const textOf = async (locator: Locator): Promise<string> => {
  const text = await locator.textContent();
  return (text ?? '').trim();
};

/** Signs in and opens the app in app mode, the way the installed app runs. */
const openApp = async (page: Page, baseURL: string | undefined, path: string): Promise<void> => {
  let signedIn = false;
  for (let attempt = 0; attempt < 3 && !signedIn; attempt += 1) {
    signedIn = await attemptSignIn(page.context());
  }
  expect(signedIn, 'the Cevi.DB sign-in should leave a session').toBe(true);
  await page
    .context()
    .addCookies([{ name: 'design-mode', value: 'design-mode-app', url: baseURL ?? '' }]);

  await page.goto(path);
  await expect(tab(page, '/app/dashboard')).toBeVisible();
};

/** A tab of the bottom tab bar. */
const tab = (page: Page, href: string): Locator => page.locator(`nav a[href="${href}"]`);

/** Taps a tab and waits until its page is the one shown. */
const tapTab = async (page: Page, href: string): Promise<void> => {
  await tab(page, href).click();
  await page.waitForURL((url) => url.pathname === href);
};

interface TabContract {
  href: string;
  /** the tab the test starts on */
  from: string;
  /** what the page shows of its own before any of its data is there */
  shell: (page: Page) => Locator;
  /** what the page shows once its data is there */
  content: (page: Page) => Locator;
}

const tabs: Record<string, TabContract> = {
  Chats: {
    href: '/app/chat',
    from: '/app/dashboard',
    shell: (page) => page.locator('header').getByText('Chats', { exact: true }),
    content: (page) => page.locator('main a[href^="/app/chat/"]:not([href^="/app/chat/new"])'),
  },
  Notfall: {
    href: '/app/emergency',
    from: '/app/dashboard',
    shell: (page) => page.getByText('Alarmieren', { exact: true }),
    content: (page) =>
      page
        .getByText('Keine Notfallkarten gefunden')
        .or(page.locator('main [data-state] button[aria-controls]'))
        .first(),
  },
  Home: {
    href: '/app/dashboard',
    from: '/app/schedule',
    shell: (page) => page.getByRole('heading', { level: 2, name: /^Hallo / }),
    content: (page) => page.getByText('Schnellzugriff'),
  },
  Karte: {
    href: '/app/map',
    from: '/app/dashboard',
    shell: (page) => page.getByPlaceholder('Ort oder Quartier suchen'),
    content: (page) => page.locator('canvas.maplibregl-canvas'),
  },
  Programm: {
    href: '/app/schedule',
    from: '/app/dashboard',
    shell: (page) => page.locator('button[aria-current="date"]'),
    content: (page) => page.locator('main a[href*="/app/schedule?"][href*="id="]').first(),
  },
};

for (const [name, contract] of Object.entries(tabs)) {
  test(`the ${name} tab shows its page at once, and its content when coming back`, async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(90_000);
    await openApp(page, baseURL, contract.from);

    // the first visit: the page itself, before any of its data has been loaded once
    await instant(page, async () => {
      await tab(page, contract.href).click();
      await page.waitForURL((url) => url.pathname === contract.href);
      await expect(tab(page, contract.href)).toHaveAttribute('aria-current', 'page');
      await expect(contract.shell(page)).toBeVisible();
    });
    await expect(contract.content(page)).toBeVisible({ timeout: 20_000 });

    // coming back: what was loaded before is there at once, no skeleton in its place
    await tapTab(page, contract.from);
    await instant(page, async () => {
      await tab(page, contract.href).click();
      await page.waitForURL((url) => url.pathname === contract.href);
      await expect(contract.shell(page)).toBeVisible();
      await expect(contract.content(page)).toBeVisible();
    });
  });
}

test('a block of the Programm opens with its title, time, place and map, and back is instant', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(90_000);
  await openApp(page, baseURL, '/app/dashboard');
  await tapTab(page, '/app/schedule');

  // another day than the first, which the list keeps in the URL; then a block with a place
  const cards = page.locator('main a[href*="/app/schedule?"][href*="id="]:has(p)');
  const idOf = (href: string | null): string | null =>
    new URL(href ?? '', 'http://app').searchParams.get('id');
  await expect(cards.first()).toBeVisible({ timeout: 20_000 });
  const firstDayIds = new Set(
    await cards.evaluateAll((links) =>
      links.map((link) =>
        new URL(link.getAttribute('href') ?? '', 'http://app').searchParams.get('id'),
      ),
    ),
  );
  await page.locator('button[aria-current="date"] + button').click();
  // the list follows the day a moment after the strip does
  await expect
    .poll(async () => {
      const candidate = await cards.first().getAttribute('href');
      return candidate?.includes('date=') === true && !firstDayIds.has(idOf(candidate));
    })
    .toBe(true);
  const href = (await cards.first().getAttribute('href')) ?? '';
  const card = page.locator(`main a[href="${href}"]`);
  const title = await textOf(card.locator('h3'));
  const meta = await textOf(card.locator('p'));
  const [place = ''] = meta.split(' · ');
  const target = new URL(href, 'http://app').searchParams;

  await instant(page, async () => {
    await card.click();
    await page.waitForURL(
      (url) =>
        url.pathname === '/app/schedule' &&
        url.searchParams.get('id') === target.get('id') &&
        url.searchParams.get('date') === target.get('date'),
    );
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByText(/\d{2}:\d{2}–\d{2}:\d{2}/).first()).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(place) })).toBeVisible();
    await expect(page.locator('main .maplibregl-map')).toBeVisible();
  });

  await instant(page, async () => {
    await page.getByRole('button', { name: 'Zurück' }).click();
    await page.waitForURL((url) => url.pathname === '/app/schedule' && !url.searchParams.has('id'));
    await expect(page.locator(`main a[href="${href}"]`)).toBeVisible();
  });
});

test('a chat opens with its name and recent messages', async ({ page, baseURL }) => {
  test.setTimeout(90_000);
  await openApp(page, baseURL, '/app/chat');

  const row = page.locator('main a[href^="/app/chat/"]:not([href^="/app/chat/new"])').first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  const href = (await row.getAttribute('href')) ?? '';
  const chatName = await textOf(row.locator('p').first());
  const preview = await textOf(row.locator('p').nth(1));
  const lastMessage = preview.split(': ').at(-1) ?? '';

  // opened once before, so its messages are on the phone
  await row.click();
  await page.waitForURL((url) => url.pathname === href);
  await expect(page.getByText(lastMessage, { exact: true })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('link', { name: 'Zurück zu den Chats' }).click();
  await page.waitForURL((url) => url.pathname === '/app/chat');
  await expect(row).toBeVisible();

  await instant(page, async () => {
    await row.click();
    await page.waitForURL((url) => url.pathname === href);
    await expect(page.getByRole('link', { name: new RegExp(`^${chatName},`) })).toBeVisible();
    await expect(page.getByText(lastMessage, { exact: true })).toBeVisible();
  });
});
