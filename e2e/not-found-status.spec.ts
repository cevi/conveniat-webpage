import { expect, test } from '@playwright/test';

/**
 * A missing file at the root answers 404, not a 200 HTML page.
 *
 * Next.js answers a partially prerendered route with the status of its prerendered shell, and
 * the catch-all `(not-found)` route used to wait for the request before reaching `notFound()`,
 * so that status was 200. Search engines indexed these URLs and the service worker cached the
 * HTML under them.
 *
 * Runs against a production build; `next dev` does not prerender.
 */

for (const path of ['/logo-missing.svg', '/x.png', '/imgs/missing.webp']) {
  test(`${path} answers 404`, async ({ request }) => {
    const response = await request.get(path);

    expect(response.status()).toBe(404);
  });
}

test('a file that exists still answers 200', async ({ request }) => {
  const response = await request.get('/favicon.ico');

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('image/x-icon');
});
