// On `globalThis`, not in a module variable: the instrumentation hook that initializes Payload and
// the route handlers that ask about it are separate bundles of one process.
const globalForInit = globalThis as unknown as { __payloadInitCompleted__?: boolean };

/**
 * Whether `onPayloadInit` finished in this process, which needs Mongo reachable and every
 * migration run, since Payload runs those before it.
 */
export const isPayloadInitCompleted = (): boolean =>
  globalForInit.__payloadInitCompleted__ === true;

/** Marks `onPayloadInit` as finished, or as to be run again after the database was reset. */
export const setPayloadInitCompleted = (completed: boolean): void => {
  globalForInit.__payloadInitCompleted__ = completed;
};
