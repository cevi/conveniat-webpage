'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * State of the admin panel's realtime stream, as surfaced by the live-sync indicator.
 *
 * - `live`: the stream is open and the server heartbeat arrives on schedule.
 * - `connecting`: the stream is being (re-)established; updates may be missing until it opens.
 * - `offline`: no heartbeat within {@link STALE_AFTER_MS}, or the browser gave up on the
 *   stream. The panel will not update on its own until this clears.
 */
export type RealtimeConnectionStatus = 'live' | 'connecting' | 'offline';

/** The server heartbeats every 20s; three missed beats mark the stream dead. */
const STALE_AFTER_MS = 65_000;
const WATCHDOG_INTERVAL_MS = 5000;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30_000;

/**
 * `EventSource.CLOSED`, spelled out so the check does not depend on the constant
 * existing on the global (it does not in every test environment).
 */
const EVENT_SOURCE_CLOSED = 2;

interface UseAdminRealtimeConnectionOptions {
  /** SSE endpoint to subscribe to. Changing it re-establishes the stream. */
  url: string;
  /** Called for every `message` frame received on the stream. */
  onEvent: (event: MessageEvent) => void;
  /**
   * Called whenever the stream may have missed events: after a reconnect, after the
   * tab wakes up, and when the server reports that its own event source was recycled.
   * Events published during such a gap are gone for good, so the caller must refetch.
   */
  onResync: () => void;
}

interface AdminRealtimeConnection {
  status: RealtimeConnectionStatus;
  /** Timestamp of the last signal (event or heartbeat) received from the server. */
  lastSignalAt: number | undefined;
  /** Drops the current stream and opens a fresh one. */
  reconnect: () => void;
}

/**
 * Keeps a long-lived `EventSource` to the chat SSE endpoint healthy and observable.
 *
 * A plain `EventSource` is not enough for a panel that has to be trusted: the browser
 * reconnects silently but never refetches what was published while the stream was down,
 * it gives up for good on a non-2xx response (an expired session, a 502 during a deploy),
 * and a half-open connection stays `OPEN` forever while nothing arrives. This hook covers
 * all three and reports the resulting state so the UI can show whether live sync works.
 */
export const useAdminRealtimeConnection = ({
  url,
  onEvent,
  onResync,
}: UseAdminRealtimeConnectionOptions): AdminRealtimeConnection => {
  const [status, setStatus] = useState<RealtimeConnectionStatus>('connecting');
  const [lastSignalAt, setLastSignalAt] = useState<number>();

  const onEventReference = useRef(onEvent);
  const onResyncReference = useRef(onResync);

  useEffect(() => {
    onEventReference.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    onResyncReference.current = onResync;
  }, [onResync]);

  const sourceReference = useRef<EventSource | undefined>(undefined);
  const reconnectTimerReference = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reconnectAttemptsReference = useRef(0);
  const hasConnectedReference = useRef(false);
  const isTornDownReference = useRef(false);
  const connectReference = useRef<() => void>(() => {});

  /**
   * Anchor for the staleness watchdog: the last moment the stream proved it was
   * alive. A fresh connection attempt counts, so a failing stream is retried on the
   * reconnect backoff instead of once per watchdog tick. Stays unset until the first
   * connection attempt, which happens in an effect rather than during render.
   */
  const aliveAtReference = useRef<number | undefined>(undefined);

  const scheduleReconnect = useCallback((): void => {
    if (isTornDownReference.current) return;
    if (reconnectTimerReference.current !== undefined) return;

    const attempt = reconnectAttemptsReference.current;
    reconnectAttemptsReference.current = attempt + 1;
    const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** attempt, RECONNECT_MAX_DELAY_MS);

    reconnectTimerReference.current = setTimeout(() => {
      reconnectTimerReference.current = undefined;
      connectReference.current();
    }, delay);
  }, []);

  const connect = useCallback((): void => {
    if (isTornDownReference.current) return;

    if (reconnectTimerReference.current !== undefined) {
      clearTimeout(reconnectTimerReference.current);
      reconnectTimerReference.current = undefined;
    }
    sourceReference.current?.close();

    aliveAtReference.current = Date.now();
    setStatus(reconnectAttemptsReference.current > 1 ? 'offline' : 'connecting');

    const source = new EventSource(url);
    sourceReference.current = source;

    const markAlive = (): void => {
      const now = Date.now();
      aliveAtReference.current = now;
      reconnectAttemptsReference.current = 0;
      setLastSignalAt(now);
      setStatus('live');
    };

    source.addEventListener('open', (): void => {
      markAlive();
      // Anything published while the stream was down was never delivered and is not
      // replayed, so a reconnect is only correct if it is followed by a refetch.
      if (hasConnectedReference.current) {
        onResyncReference.current();
      }
      hasConnectedReference.current = true;
    });

    source.addEventListener('heartbeat', (): void => {
      markAlive();
    });

    // The server recycled its Postgres LISTEN connection: this stream stayed open
    // the whole time, so the client has no other way of learning about the gap.
    source.addEventListener('resync', (): void => {
      markAlive();
      onResyncReference.current();
    });

    source.addEventListener('message', (event): void => {
      markAlive();
      onEventReference.current(event);
    });

    source.addEventListener('error', (): void => {
      // `CONNECTING` means the browser retries on its own. `CLOSED` means it gave up
      // permanently - which is what happens when the endpoint answers with a status
      // code instead of a stream - and nothing reopens it unless we do.
      if (source.readyState === EVENT_SOURCE_CLOSED) {
        setStatus('offline');
        scheduleReconnect();
        return;
      }
      setStatus((current) => (current === 'offline' ? 'offline' : 'connecting'));
    });
  }, [url, scheduleReconnect]);

  useEffect(() => {
    connectReference.current = connect;
  }, [connect]);

  useEffect(() => {
    isTornDownReference.current = false;
    connect();

    return (): void => {
      isTornDownReference.current = true;
      if (reconnectTimerReference.current !== undefined) {
        clearTimeout(reconnectTimerReference.current);
        reconnectTimerReference.current = undefined;
      }
      sourceReference.current?.close();
      sourceReference.current = undefined;
    };
  }, [connect]);

  // Watchdog for the case the browser cannot see: a connection that is still `OPEN`
  // but no longer carries anything (laptop resumed from sleep, network switched,
  // proxy dropped the socket without an RST). The missing heartbeat is the only clue.
  useEffect(() => {
    const watchdog = setInterval((): void => {
      const aliveAt = aliveAtReference.current;
      if (aliveAt === undefined || Date.now() - aliveAt <= STALE_AFTER_MS) return;
      console.warn('[Admin SSE] No heartbeat from the server, reconnecting');
      setStatus('offline');
      connectReference.current();
    }, WATCHDOG_INTERVAL_MS);

    return (): void => clearInterval(watchdog);
  }, []);

  useEffect(() => {
    const handleWake = (): void => {
      if (document.visibilityState !== 'visible') return;
      const aliveAt = aliveAtReference.current;
      if (aliveAt !== undefined && Date.now() - aliveAt > STALE_AFTER_MS) {
        connectReference.current();
        return;
      }
      onResyncReference.current();
    };

    document.addEventListener('visibilitychange', handleWake);
    globalThis.addEventListener('online', handleWake);

    return (): void => {
      document.removeEventListener('visibilitychange', handleWake);
      globalThis.removeEventListener('online', handleWake);
    };
  }, []);

  const reconnect = useCallback((): void => {
    reconnectAttemptsReference.current = 0;
    connectReference.current();
  }, []);

  return { status, lastSignalAt, reconnect };
};
