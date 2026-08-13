/**
 * State of a realtime stream, as surfaced by the live-sync indicators.
 *
 * - `live`: the stream is open and the server heartbeat arrives on schedule.
 * - `connecting`: the stream is being (re-)established; updates may be missing until it opens.
 * - `offline`: no heartbeat within {@link STALE_AFTER_MS}, or the browser gave up on the
 *   stream. Nothing updates on its own until this clears.
 */
export type RealtimeConnectionStatus = 'live' | 'connecting' | 'offline';

/** The server heartbeats every 20s; three missed beats mark the stream dead. */
const STALE_AFTER_MS = 65_000;
const WATCHDOG_INTERVAL_MS = 5000;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30_000;

/**
 * Window the refetch that follows a gap is spread over.
 *
 * Every client loses its stream at the same instant when a replica restarts, and each
 * one answers with a full resync - the chat list, plus the messages and details of
 * every subscribed chat. Firing those the moment the stream reopens points the whole
 * fleet at a process that has just started. Well under a second of added staleness
 * buys a burst spread across seconds instead.
 */
const RESYNC_JITTER_MS = 3000;

/**
 * `EventSource.CLOSED`, spelled out so the check does not depend on the constant
 * existing on the global (it does not in every test environment).
 */
const EVENT_SOURCE_CLOSED = 2;

export interface RealtimeConnectionOptions {
  /** Called for every `message` frame received on the stream. */
  onEvent: (event: MessageEvent) => void;
  /**
   * Called whenever the stream may have missed events: after a reconnect, after the
   * tab wakes up, and when the server reports that its own event source was recycled.
   * Events published during such a gap are gone for good, so the caller must refetch.
   */
  onResync: () => void;
  /** Called whenever {@link RealtimeConnection.getStatus} changes value. */
  onStatusChange?: (status: RealtimeConnectionStatus) => void;
  /** Called every time the server proves the stream is alive (event or heartbeat). */
  onSignal?: (at: number) => void;
  /** Prefix for the console warnings this engine emits, e.g. `[Chat][SSE]`. */
  logPrefix: string;
}

export interface RealtimeConnection {
  /**
   * Points the stream at `url`, reconnecting only if it actually changed. Passing
   * `undefined` tears the stream down without disposing of the engine, so the same
   * instance can be pointed at a new URL later.
   */
  setUrl: (url: string | undefined) => void;
  /** Drops the current stream and opens a fresh one immediately. */
  reconnect: () => void;
  /** Tears everything down: stream, timers and global listeners. */
  close: () => void;
  getStatus: () => RealtimeConnectionStatus;
  /** Timestamp of the last signal (event or heartbeat) received from the server. */
  getLastSignalAt: () => number | undefined;
}

/**
 * Keeps a long-lived `EventSource` healthy and observable.
 *
 * A plain `EventSource` is not enough for a view that has to be trusted: the browser
 * reconnects silently but never refetches what was published while the stream was down,
 * it gives up for good on a non-2xx response (an expired session, a 502 during a deploy),
 * and a half-open connection stays `OPEN` forever while nothing arrives. This engine
 * covers all three and reports the resulting state so the UI can show whether live sync
 * works.
 *
 * It is deliberately framework-agnostic: the admin panel drives one instance per mounted
 * hook, while the app-side chat screens share a single multiplexed instance whose URL
 * changes as the set of subscribed chats grows.
 */
export const createRealtimeConnection = ({
  onEvent,
  onResync,
  onStatusChange,
  onSignal,
  logPrefix,
}: RealtimeConnectionOptions): RealtimeConnection => {
  let url: string | undefined = undefined;
  let source: EventSource | undefined = undefined;
  let status: RealtimeConnectionStatus = 'connecting';
  let lastSignalAt: number | undefined = undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined = undefined;
  let resyncTimer: ReturnType<typeof setTimeout> | undefined = undefined;
  let watchdogTimer: ReturnType<typeof setInterval> | undefined = undefined;
  let reconnectAttempts = 0;
  let hasConnectedBefore = false;
  let areWakeListenersAttached = false;

  /**
   * Anchor for the staleness watchdog: the last moment the stream proved it was
   * alive. A fresh connection attempt counts, so a stream that never opens is retried
   * on the reconnect backoff instead of once per watchdog tick.
   */
  let aliveAt: number | undefined = undefined;

  const setStatus = (next: RealtimeConnectionStatus): void => {
    if (status === next) return;
    status = next;
    onStatusChange?.(next);
  };

  const clearReconnectTimer = (): void => {
    if (reconnectTimer === undefined) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  };

  const stopWatchdog = (): void => {
    if (watchdogTimer === undefined) return;
    clearInterval(watchdogTimer);
    watchdogTimer = undefined;
  };

  const clearResyncTimer = (): void => {
    if (resyncTimer === undefined) return;
    clearTimeout(resyncTimer);
    resyncTimer = undefined;
  };

  /**
   * Queues the refetch that follows a delivery gap.
   *
   * Deferred by a random slice of {@link RESYNC_JITTER_MS} so that a fleet-wide
   * reconnect does not turn into a fleet-wide refetch at the same instant, and
   * collapsed while one is already pending: reopening the stream and receiving a
   * `resync` frame describe the same gap and only need one refetch between them.
   */
  const requestResync = (): void => {
    if (resyncTimer !== undefined) return;

    resyncTimer = setTimeout(() => {
      resyncTimer = undefined;
      onResync();
    }, Math.random() * RESYNC_JITTER_MS);
  };

  const scheduleReconnect = (): void => {
    if (url === undefined) return;
    if (reconnectTimer !== undefined) return;

    const attempt = reconnectAttempts;
    reconnectAttempts = attempt + 1;
    const ceiling = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** attempt, RECONNECT_MAX_DELAY_MS);
    // Equal jitter: half the backoff is fixed, half is random. Full randomisation
    // would let a failing endpoint be retried almost immediately, while no jitter at
    // all keeps every client that dropped together retrying together, forever.
    const delay = ceiling / 2 + Math.random() * (ceiling / 2);

    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, delay);
  };

  // Watchdog for the case the browser cannot see: a connection that is still `OPEN`
  // but no longer carries anything (laptop resumed from sleep, network switched,
  // proxy dropped the socket without an RST). The missing heartbeat is the only clue.
  const startWatchdog = (): void => {
    if (watchdogTimer !== undefined) return;

    watchdogTimer = setInterval((): void => {
      if (aliveAt === undefined || Date.now() - aliveAt <= STALE_AFTER_MS) return;
      console.warn(`${logPrefix} No heartbeat from the server, reconnecting`);
      setStatus('offline');
      connect();
    }, WATCHDOG_INTERVAL_MS);
  };

  const handleWake = (): void => {
    if (url === undefined) return;
    if (document.visibilityState !== 'visible') return;

    // A tab that was suspended long enough for the stream to die needs a new one;
    // otherwise the stream is fine and only the data behind it may have moved on.
    if (aliveAt !== undefined && Date.now() - aliveAt > STALE_AFTER_MS) {
      connect();
      return;
    }
    requestResync();
  };

  const attachWakeListeners = (): void => {
    if (areWakeListenersAttached) return;
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', handleWake);
    globalThis.addEventListener('online', handleWake);
    areWakeListenersAttached = true;
  };

  const detachWakeListeners = (): void => {
    if (!areWakeListenersAttached) return;
    document.removeEventListener('visibilitychange', handleWake);
    globalThis.removeEventListener('online', handleWake);
    areWakeListenersAttached = false;
  };

  const markAlive = (): void => {
    const now = Date.now();
    aliveAt = now;
    lastSignalAt = now;
    reconnectAttempts = 0;
    onSignal?.(now);
    setStatus('live');
  };

  // A function declaration so that the handlers above, which all run asynchronously,
  // can schedule it before it is defined.
  function connect(): void {
    if (url === undefined) return;

    clearReconnectTimer();
    source?.close();

    aliveAt = Date.now();
    // A first attempt is ordinary; repeated ones mean the user is genuinely cut off.
    setStatus(reconnectAttempts > 1 ? 'offline' : 'connecting');

    const nextSource = new EventSource(url);
    source = nextSource;

    nextSource.addEventListener('open', (): void => {
      markAlive();
      // Anything published while the stream was down was never delivered and is not
      // replayed, so a reconnect is only correct if it is followed by a refetch.
      if (hasConnectedBefore) {
        requestResync();
      }
      hasConnectedBefore = true;
    });

    nextSource.addEventListener('heartbeat', (): void => {
      markAlive();
    });

    // The server recycled its Postgres LISTEN connection: this stream stayed open
    // the whole time, so the client has no other way of learning about the gap.
    nextSource.addEventListener('resync', (): void => {
      console.warn(`${logPrefix} Server signalled a delivery gap, refetching`);
      markAlive();
      requestResync();
    });

    nextSource.addEventListener('message', (event): void => {
      markAlive();
      onEvent(event);
    });

    nextSource.addEventListener('error', (): void => {
      // `CONNECTING` means the browser retries on its own. `CLOSED` means it gave up
      // permanently - which is what happens when the endpoint answers with a status
      // code instead of a stream - and nothing reopens it unless we do.
      if (nextSource.readyState === EVENT_SOURCE_CLOSED) {
        setStatus('offline');
        scheduleReconnect();
        return;
      }
      if (status !== 'offline') {
        setStatus('connecting');
      }
    });

    startWatchdog();
    attachWakeListeners();
  }

  const teardown = (): void => {
    clearReconnectTimer();
    clearResyncTimer();
    stopWatchdog();
    detachWakeListeners();
    source?.close();
    source = undefined;
  };

  return {
    setUrl: (nextUrl: string | undefined): void => {
      if (nextUrl === url) return;
      url = nextUrl;

      if (nextUrl === undefined) {
        teardown();
        return;
      }

      reconnectAttempts = 0;
      connect();
    },

    reconnect: (): void => {
      reconnectAttempts = 0;
      connect();
    },

    close: (): void => {
      url = undefined;
      teardown();
    },

    getStatus: (): RealtimeConnectionStatus => status,
    getLastSignalAt: (): number | undefined => lastSignalAt,
  };
};
