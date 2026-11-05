/**
 * @jest-environment jsdom
 */

import { claimAppLinks, useAppWebViewNavigate } from '@/hooks/use-app-webview-navigate';
import { renderHook } from '@testing-library/react';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: (): unknown => ({ push }) }));

beforeEach(() => {
  push.mockClear();
});

describe('links the native app hands to the page', () => {
  it('opens a link of this origin with the router, and says it did', () => {
    renderHook(() => useAppWebViewNavigate());
    const navigate = globalThis.AppWebViewNavigate;

    expect(navigate?.(`${globalThis.location.origin}/tag/0462415A7E2490?x=1#top`)).toBe(true);
    expect(push).toHaveBeenCalledWith('/tag/0462415A7E2490?x=1#top');
  });

  it('leaves a link of another origin, or no link, to the app', () => {
    renderHook(() => useAppWebViewNavigate());
    const navigate = globalThis.AppWebViewNavigate;

    expect(navigate?.('https://example.com/tag/0462415A7E2490')).toBe(false);
    expect(navigate?.('javascript:alert(1)')).toBe(false);
    expect(navigate?.(42 as unknown as string)).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });

  it('is gone once the page is', () => {
    const { unmount } = renderHook(() => useAppWebViewNavigate());
    expect(typeof globalThis.AppWebViewNavigate).toBe('function');
    unmount();
    expect(globalThis.AppWebViewNavigate).toBeUndefined();
  });

  it('lets an open view take a link first, the one that claimed last first, until it gives up', () => {
    renderHook(() => useAppWebViewNavigate());
    const navigate = globalThis.AppWebViewNavigate;
    const sheet = jest.fn((target: URL) => target.pathname.startsWith('/tag/'));
    const scanner = jest.fn(() => true);
    const releaseSheet = claimAppLinks(sheet);
    const releaseScanner = claimAppLinks(scanner);

    expect(navigate?.(`${globalThis.location.origin}/tag/0462415A7E2490`)).toBe(true);
    expect(scanner).toHaveBeenCalledTimes(1);
    expect(sheet).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();

    releaseScanner();
    // a link no view takes goes to the router as before
    expect(navigate?.(`${globalThis.location.origin}/app/chat`)).toBe(true);
    expect(push).toHaveBeenCalledWith('/app/chat');

    releaseSheet();
    navigate?.(`${globalThis.location.origin}/tag/0462415A7E2490`);
    expect(push).toHaveBeenLastCalledWith('/tag/0462415A7E2490');
    // asked only for the chat link, while it still claimed
    expect(sheet).toHaveBeenCalledTimes(1);
  });
});
