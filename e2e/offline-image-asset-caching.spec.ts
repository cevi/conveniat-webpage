import { expect, test } from '@playwright/test';

test.describe('Offline Image & Asset Caching', () => {
  test('should verify Next.js image optimization URL pattern matching', () => {
    const nextImageUrl = '/_next/image?url=%2Fapi%2Fmedia%2Ffile%2Fhero.jpg&w=1080&q=75';

    // Test regex matching logic for /_next/image
    const standardRegex = /\.(png|jpg|jpeg|svg|gif|webp|ico)$/;
    const nextImageRegex = /^\/_next\/image/;

    expect(standardRegex.test(nextImageUrl)).toBe(false);
    expect(nextImageRegex.test(nextImageUrl)).toBe(true);
  });
});
