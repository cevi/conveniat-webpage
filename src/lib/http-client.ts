import 'server-only';
import { Agent, setGlobalDispatcher } from 'undici';

// Configure Global Agent once
export function initHttpClient(): void {
  setGlobalDispatcher(
    new Agent({
      keepAliveTimeout: 10_000,
      keepAliveMaxTimeout: 10_000,
      headersTimeout: 10_000,
      bodyTimeout: 30_000,
      connect: { timeout: 10_000, keepAlive: true },
      pipelining: 0,
      connections: 50,
    }),
  );
}
