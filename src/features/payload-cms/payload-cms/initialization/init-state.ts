// On `globalThis`, not in a module variable: the instrumentation hook that initializes Payload and
// the route handlers that ask about it are separate bundles of one process.
const globalForInit = globalThis as unknown as {
  __payloadInitCompleted__?: boolean;
  __payloadInitFailed__?: boolean;
};

/** Whether `onPayloadInit` finished in this process, so a second call has nothing to do. */
export const isPayloadInitCompleted = (): boolean =>
  globalForInit.__payloadInitCompleted__ === true;

/** Marks `onPayloadInit` as finished, or as to be run again after the database was reset. */
export const setPayloadInitCompleted = (completed: boolean): void => {
  globalForInit.__payloadInitCompleted__ = completed;
};

/**
 * Whether initializing Payload failed in this process: Mongo was unreachable, or a migration
 * threw. Payload does not run `onPayloadInit` again on a later `getPayload`, so such a process
 * stays without its worker heartbeat and start-up work; only a new process recovers.
 */
export const hasPayloadInitFailed = (): boolean => globalForInit.__payloadInitFailed__ === true;

/** Marks the initialization of this process as failed, for good. */
export const markPayloadInitFailed = (): void => {
  globalForInit.__payloadInitFailed__ = true;
};
