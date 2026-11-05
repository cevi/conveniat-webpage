/**
 * @jest-environment jsdom
 */

import { chatIdOfTarget, resolvePushTarget, resolveSameOriginPath } from '@/utils/push-target';

describe('resolvePushTarget', () => {
  it('keeps a link to another origin whole', () => {
    expect(resolvePushTarget('https://con27.ch/agbs')).toBe('https://con27.ch/agbs');
  });

  it('falls back to the dashboard for a URL that is not http(s)', () => {
    expect(resolvePushTarget('javascript:alert(1)')).toBe('/app/dashboard');
    expect(resolvePushTarget('')).toBe('/app/dashboard');
  });
});

describe('resolveSameOriginPath', () => {
  it('keeps a path on this origin with its query and fragment', () => {
    expect(resolveSameOriginPath('/app/chat/abc?tab=info#latest')).toBe(
      '/app/chat/abc?tab=info#latest',
    );
    expect(resolveSameOriginPath(`${globalThis.location.origin}/app/schedule`)).toBe(
      '/app/schedule',
    );
  });

  it.each([
    'javascript:alert(1)',
    ' JaVaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'https://example.org/login',
    '//example.org/login',
    String.raw`/\example.org/login`,
    String.raw`\\example.org/login`,
  ])('rejects %s', (target) => {
    expect(resolveSameOriginPath(target)).toBeUndefined();
  });

  it('returns undefined when the link carries no target', () => {
    expect(resolveSameOriginPath(null)).toBeUndefined();
    expect(resolveSameOriginPath('  ')).toBeUndefined();
  });
});

describe('chatIdOfTarget', () => {
  it('reads the chat of a chat target, without its query or sub-route', () => {
    expect(chatIdOfTarget('/app/chat/abc?app-mode=true')).toBe('abc');
    expect(chatIdOfTarget('/app/chat/abc/details')).toBe('abc');
  });

  it('finds none in the chat overview or another page', () => {
    expect(chatIdOfTarget('/app/chat')).toBeUndefined();
    expect(chatIdOfTarget('/app/schedule')).toBeUndefined();
  });
});
