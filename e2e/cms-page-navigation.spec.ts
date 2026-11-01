import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/**
 * A client navigation between two CMS pages shows the page it navigated to.
 *
 * Every CMS page is the one `[[...slugs]]` route. The header logo links to `/` with
 * `prefetch={true}`, and Next.js 16.4 records the prefetched index page as not depending on
 * `slugs` (vercel/next.js#99675). The router then reuses the homepage for every other slug: the
 * URL changes, no request is made, and the homepage stays on screen until a reload.
 *
 * Runs against a production build, see instant-nav.rig.md; `next dev` does not prefetch.
 */

// the router's cache is under test, not the service worker's copies
test.use({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });

/** The heading the user sees; pages the router keeps mounted for back navigation are hidden. */
const visibleHeading = async (page: Page): Promise<string> =>
  ((await page.locator('h1:visible').first().textContent()) ?? '').trim();

/** Loads a page from scratch and reads its heading, the reference for a client navigation. */
const headingOnFullLoad = async (page: Page, path: string): Promise<string> => {
  await page.goto(path);
  return await visibleHeading(page);
};

for (const { start, target } of [
  { start: '/kontakt', target: '/faq' },
  { start: '/faq', target: '/ueber-uns' },
]) {
  test(`navigating from ${start} to ${target} shows ${target}`, async ({ page }) => {
    const expectedHeading = await headingOnFullLoad(page, target);
    const homeHeading = await headingOnFullLoad(page, '/');
    expect(expectedHeading).not.toBe(homeHeading);

    const homePrefetch = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/' &&
        response.request().headers()['next-router-prefetch'] !== undefined,
    );
    await page.goto(start);
    await homePrefetch;
    await page.waitForLoadState('networkidle');

    // The seeded stack has no menu entries to click. `router.push` is the navigation a
    // `<Link>` click runs, against the same prefetch cache.
    await page.evaluate((path) => {
      (
        globalThis as unknown as { next: { router: { push: (href: string) => void } } }
      ).next.router.push(path);
    }, target);

    await expect(page).toHaveURL(target);
    await expect.poll(() => visibleHeading(page)).toBe(expectedHeading);
  });
}
