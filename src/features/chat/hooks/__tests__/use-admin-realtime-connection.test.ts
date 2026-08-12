/**
 * @jest-environment jsdom
 */

import { useAdminRealtimeConnection } from '@/features/chat/hooks/use-admin-realtime-connection';
import type { RenderHookResult } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react';

const EVENT_SOURCE_CONNECTING = 0;
const EVENT_SOURCE_OPEN = 1;
const EVENT_SOURCE_CLOSED = 2;

class FakeEventSource {
  public static instances: FakeEventSource[] = [];

  public readyState = EVENT_SOURCE_CONNECTING;
  public closed = false;
  private listeners = new Map<string, ((event: unknown) => void)[]>();

  public constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }

  public addEventListener(type: string, listener: (event: unknown) => void): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  public close(): void {
    this.closed = true;
    this.readyState = EVENT_SOURCE_CLOSED;
  }

  public emit(type: string, event: unknown = {}): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  /** Simulates the server accepting the stream. */
  public open(): void {
    this.readyState = EVENT_SOURCE_OPEN;
    this.emit('open');
  }
}

const latestSource = (): FakeEventSource => {
  const source = FakeEventSource.instances.at(-1);
  if (!source) throw new Error('no EventSource was created');
  return source;
};

describe('useAdminRealtimeConnection', () => {
  const onEvent = jest.fn();
  const onResync = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    FakeEventSource.instances = [];
    globalThis.EventSource = FakeEventSource as unknown as typeof EventSource;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const render = (): RenderHookResult<ReturnType<typeof useAdminRealtimeConnection>, unknown> =>
    renderHook(() =>
      useAdminRealtimeConnection({ url: '/api/chat/sse?chatIds=all', onEvent, onResync }),
    );

  it('reports "live" once the stream opens and forwards message events', () => {
    const { result, unmount } = render();

    expect(result.current.status).toBe('connecting');

    act(() => latestSource().open());
    expect(result.current.status).toBe('live');
    // The first connect has nothing to catch up on.
    expect(onResync).not.toHaveBeenCalled();

    act(() => latestSource().emit('message', { data: '{}' }));
    expect(onEvent).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('refetches after a reconnect, because events published during the gap are lost', () => {
    const { unmount } = render();

    act(() => latestSource().open());
    // The browser dropped and re-opened the stream on its own.
    act(() => latestSource().emit('error'));
    act(() => latestSource().open());

    expect(onResync).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('refetches when the server reports a delivery gap', () => {
    const { unmount } = render();

    act(() => latestSource().open());
    act(() => latestSource().emit('resync'));

    expect(onResync).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('reconnects itself when the browser gives up on the stream', () => {
    const { result, unmount } = render();

    act(() => latestSource().open());

    act(() => {
      const source = latestSource();
      source.readyState = EVENT_SOURCE_CLOSED;
      source.emit('error');
    });
    expect(result.current.status).toBe('offline');
    expect(FakeEventSource.instances).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(FakeEventSource.instances).toHaveLength(2);

    unmount();
  });

  it('reconnects a stream that stopped heartbeating while still reported as open', () => {
    const { result, unmount } = render();

    act(() => latestSource().open());
    expect(result.current.status).toBe('live');

    // Two heartbeats arrive on schedule, then the connection silently dies.
    act(() => {
      jest.advanceTimersByTime(20_000);
      latestSource().emit('heartbeat');
      jest.advanceTimersByTime(20_000);
      latestSource().emit('heartbeat');
    });
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(result.current.status).toBe('live');

    act(() => {
      jest.advanceTimersByTime(70_000);
    });

    expect(FakeEventSource.instances).toHaveLength(2);
    expect(FakeEventSource.instances[0]?.closed).toBe(true);

    act(() => latestSource().open());
    expect(result.current.status).toBe('live');
    expect(onResync).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('closes the stream on unmount', () => {
    const { unmount } = render();
    act(() => latestSource().open());

    const source = latestSource();
    unmount();

    expect(source.closed).toBe(true);
  });
});
