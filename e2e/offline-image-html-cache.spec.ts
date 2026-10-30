import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/**
 * An HTML page served under an image URL never ends up as the image.
 *
 * A soft 404 or a captive portal on the camp wifi answers an image request with a 200 HTML page.
 * The image cache revalidates in the background, so once such a page was stored, the worker kept
 * serving it in place of the image, and a later 404 never replaced it.
 *
 * Runs against a production build; the service worker does not cache in `next dev`.
 */

const IMAGES_CACHE = 'images-cache-v1';
const PROBE_PATH = '/e2e-image-cache-probe.png';
const HTML_PAGE = '<!DOCTYPE html><html><body>Login to the camp wifi</body></html>';
// The smallest valid PNG, one transparent pixel.
const PNG_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const waitForServiceWorker = async (page: Page): Promise<void> => {
  await page.goto('/entrypoint?app-mode=true');
  await page.goto('/app/dashboard');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
};

const fetchContentType = (page: Page, url: string): Promise<string | null> =>
  page.evaluate(async (target) => {
    const response = await fetch(target);
    return response.headers.get('content-type');
  }, url);

const readCachedContentType = (page: Page, url: string): Promise<string | null | undefined> =>
  page.evaluate(
    async ({ cacheName, target }) => {
      const cache = await caches.open(cacheName);
      const cached = await cache.match(new URL(target, location.origin).href);
      return cached?.headers.get('content-type');
    },
    { cacheName: IMAGES_CACHE, target: url },
  );

test.describe('Image cache refuses HTML', () => {
  test('does not store an HTML page answered for an image', async ({ page, context }) => {
    await context.route(`**${PROBE_PATH}*`, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML_PAGE }),
    );
    await waitForServiceWorker(page);

    const url = `${PROBE_PATH}?case=store`;
    await fetchContentType(page, url);
    // The cache write runs after the response reached the page.
    await page.waitForTimeout(1000);

    expect(await readCachedContentType(page, url)).toBeUndefined();
  });

  test('does not serve an HTML page stored for an image earlier', async ({ page, context }) => {
    await context.route(`**${PROBE_PATH}*`, (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PNG_PIXEL }),
    );
    await waitForServiceWorker(page);

    const url = `${PROBE_PATH}?case=serve`;
    await page.evaluate(
      async ({ cacheName, target, body }) => {
        const cache = await caches.open(cacheName);
        await cache.put(
          new URL(target, location.origin).href,
          new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } }),
        );
      },
      { cacheName: IMAGES_CACHE, target: url, body: HTML_PAGE },
    );

    expect(await fetchContentType(page, url)).toBe('image/png');
  });
});
