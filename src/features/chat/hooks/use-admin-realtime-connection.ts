'use client';

import type {
  RealtimeConnection,
  RealtimeConnectionStatus,
} from '@/features/chat/utils/realtime-connection';
import { createRealtimeConnection } from '@/features/chat/utils/realtime-connection';
import { useCallback, useEffect, useRef, useState } from 'react';

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
 * React binding around the shared realtime engine for the admin panel, which drives
 * exactly one stream per mounted panel.
 *
 * All the connection handling - heartbeat watchdog, backoff retry, resync on tab wake -
 * lives in {@link createRealtimeConnection}; this hook only owns the React state the
 * live-sync badge renders from.
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

  const connectionReference = useRef<RealtimeConnection | undefined>(undefined);

  // The engine outlives URL changes so that a wider subscription set reuses the same
  // watchdog and backoff state instead of starting over.
  useEffect(() => {
    const connection = createRealtimeConnection({
      logPrefix: '[Admin SSE]',
      onEvent: (event) => onEventReference.current(event),
      onResync: () => onResyncReference.current(),
      onStatusChange: setStatus,
      onSignal: setLastSignalAt,
    });
    connectionReference.current = connection;

    return (): void => {
      connection.close();
      connectionReference.current = undefined;
    };
  }, []);

  useEffect(() => {
    connectionReference.current?.setUrl(url);
  }, [url]);

  const reconnect = useCallback((): void => {
    connectionReference.current?.reconnect();
  }, []);

  return { status, lastSignalAt, reconnect };
};
