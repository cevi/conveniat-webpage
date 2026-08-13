/**
 * @jest-environment jsdom
 */

import type { RealtimeConnection } from '@/features/chat/utils/realtime-connection';
import { createRealtimeConnection } from '@/features/chat/utils/realtime-connection';

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

describe('createRealtimeConnection', () => {
  const onEvent = jest.fn();
  const onResync = jest.fn();
  const onStatusChange = jest.fn();
  let connection: RealtimeConnection;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    FakeEventSource.instances = [];
    globalThis.EventSource = FakeEventSource as unknown as typeof EventSource;

    connection = createRealtimeConnection({
      logPrefix: '[Test]',
      onEvent,
      onResync,
      onStatusChange,
    });
  });

  afterEach(() => {
    connection.close();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('opens no stream until a URL is set', () => {
    expect(FakeEventSource.instances).toHaveLength(0);

    connection.setUrl('/api/chat/sse?chatIds=a');

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(latestSource().url).toBe('/api/chat/sse?chatIds=a');
  });

  it('reports "live" once the stream opens and forwards message events', () => {
    connection.setUrl('/api/chat/sse?chatIds=a');
    expect(connection.getStatus()).toBe('connecting');

    latestSource().open();

    expect(connection.getStatus()).toBe('live');
    // The first connect has nothing to catch up on.
    expect(onResync).not.toHaveBeenCalled();

    latestSource().emit('message', { data: '{}' });
    expect(onEvent).toHaveBeenCalledTimes(1);
  });

  it('does not reconnect when the URL is unchanged', () => {
    connection.setUrl('/api/chat/sse?chatIds=a');
    latestSource().open();

    connection.setUrl('/api/chat/sse?chatIds=a');

    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it('reconnects and refetches when the subscription set grows', () => {
    connection.setUrl('/api/chat/sse?chatIds=a');
    latestSource().open();
    const first = latestSource();

    connection.setUrl('/api/chat/sse?chatIds=a,b');

    expect(first.closed).toBe(true);
    expect(FakeEventSource.instances).toHaveLength(2);

    // Events published between the two streams were never delivered.
    latestSource().open();
    expect(onResync).toHaveBeenCalledTimes(1);
  });

  it('refetches when the server reports a delivery gap', () => {
    connection.setUrl('/api/chat/sse?chatIds=a');
    latestSource().open();

    latestSource().emit('resync');

    expect(onResync).toHaveBeenCalledTimes(1);
  });

  it('reconnects itself when the browser gives up on the stream', () => {
    connection.setUrl('/api/chat/sse?chatIds=a');
    latestSource().open();

    const source = latestSource();
    source.readyState = EVENT_SOURCE_CLOSED;
    source.emit('error');

    expect(connection.getStatus()).toBe('offline');
    expect(FakeEventSource.instances).toHaveLength(1);

    jest.advanceTimersByTime(1000);

    expect(FakeEventSource.instances).toHaveLength(2);
  });

  it('reconnects a stream that stopped heartbeating while still reported as open', () => {
    connection.setUrl('/api/chat/sse?chatIds=a');
    latestSource().open();
    expect(connection.getStatus()).toBe('live');

    // Two heartbeats arrive on schedule, then the connection silently dies.
    jest.advanceTimersByTime(20_000);
    latestSource().emit('heartbeat');
    jest.advanceTimersByTime(20_000);
    latestSource().emit('heartbeat');

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(connection.getStatus()).toBe('live');

    jest.advanceTimersByTime(70_000);

    expect(FakeEventSource.instances).toHaveLength(2);
    expect(FakeEventSource.instances[0]?.closed).toBe(true);

    latestSource().open();
    expect(connection.getStatus()).toBe('live');
    expect(onResync).toHaveBeenCalledTimes(1);
  });

  it('tracks the last signal from the server', () => {
    connection.setUrl('/api/chat/sse?chatIds=a');
    expect(connection.getLastSignalAt()).toBeUndefined();

    latestSource().open();

    expect(connection.getLastSignalAt()).toBe(Date.now());
  });

  it('closes the stream and stops the watchdog when the URL is cleared', () => {
    connection.setUrl('/api/chat/sse?chatIds=a');
    latestSource().open();
    const source = latestSource();

    connection.setUrl(undefined);

    expect(source.closed).toBe(true);

    // A dead stream must not be revived by the watchdog once nobody subscribes.
    jest.advanceTimersByTime(120_000);
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it('can be pointed at a new URL after having been cleared', () => {
    connection.setUrl('/api/chat/sse?chatIds=a');
    connection.setUrl(undefined);

    connection.setUrl('/api/chat/sse?chatIds=a');

    expect(FakeEventSource.instances).toHaveLength(2);
  });

  it('stops reconnecting after close()', () => {
    connection.setUrl('/api/chat/sse?chatIds=a');
    const source = latestSource();
    source.readyState = EVENT_SOURCE_CLOSED;
    source.emit('error');

    connection.close();
    jest.advanceTimersByTime(120_000);

    expect(source.closed).toBe(true);
    expect(FakeEventSource.instances).toHaveLength(1);
  });
});
