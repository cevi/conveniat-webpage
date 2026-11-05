/**
 * @jest-environment jsdom
 */

import { useAppWebViewNavigate } from '@/hooks/use-app-webview-navigate';
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
});
