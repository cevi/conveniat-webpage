/* eslint-disable n/no-process-env */
import { otelLogDestination } from '@/features/payload-cms/payload-cms/utils/otel-log-destination';
import os from 'node:os';

/**
 * The default logger for server-side code that has no Payload `req` in scope.
 *
 * Where a request is available, `req.payload.logger` stays the right choice.
 * Everywhere else on the server — cache handlers, routers, jobs, scripts —
 * prefer this over `console.*`:
 *
 * - it writes through the same destination as Payload's logger
 *   (`@/features/payload-cms/payload-cms/utils/otel-log-destination`), so records
 *   reach Loki with `service_name`, `deployment_environment_name`, `severity_text`
 *   and the commit hash, and carry the `trace_id` / `span_id` of the request that
 *   produced them
 * - it still writes every line to stdout, so `docker service logs` and dozzle are
 *   unaffected
 * - it has levels, so per-render and per-cache-write debug output can be switched
 *   off in production instead of being shipped forever
 *
 * `console.log`/`info`/`debug` are NOT bridged into Loki (see
 * `@/utils/otel-console-bridge`), so anything logged that way is invisible in
 * Grafana. The console bridge covers `error`/`warn` only, as a safety net for
 * failures nobody routed properly.
 *
 * Deliberately not built on pino, even though the destination speaks pino's
 * record format: `src/cache-handlers/default.ts` is bundled into a standalone CJS
 * file by `pnpm build:cache`, and pino's transport machinery does not survive
 * bundling. Emitting the record shape directly keeps this usable from the cache
 * handlers, which are the loudest logger in the app.
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** Pino numeric levels — the destination maps these to OTel severities. */
const LEVEL_VALUES: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

const isLogLevel = (value: string): value is LogLevel => value in LEVEL_VALUES;

/**
 * Debug output is on by default outside production, off inside it. Override with
 * `LOG_LEVEL` (one of the level names) to turn it back on for an environment.
 */
const configuredLevel = (): LogLevel => {
  const configured = process.env['LOG_LEVEL']?.trim().toLowerCase();
  if (configured !== undefined && configured !== '' && isLogLevel(configured)) return configured;

  return process.env['NODE_ENV'] === 'production' ? 'info' : 'debug';
};

/** Attributes become queryable Loki labels; objects are JSON-encoded by the destination. */
export type LogAttributes = Record<string, unknown>;

/**
 * `Error` carries its interesting fields on the prototype, so `JSON.stringify`
 * renders it as `{}`. Flatten it before it reaches the destination, otherwise the
 * one attribute worth having in Loki is the one that gets lost.
 */
const flattenErrors = (attributes: LogAttributes): LogAttributes => {
  const flattened: LogAttributes = {};

  for (const [key, value] of Object.entries(attributes)) {
    if (value instanceof Error) {
      flattened[`${key}.message`] = value.message;
      flattened[`${key}.name`] = value.name;
      if (value.stack !== undefined) flattened[`${key}.stack`] = value.stack;
    } else {
      flattened[key] = value;
    }
  }

  return flattened;
};

export interface ServerLogger {
  trace: (message: string, attributes?: LogAttributes) => void;
  debug: (message: string, attributes?: LogAttributes) => void;
  info: (message: string, attributes?: LogAttributes) => void;
  warn: (message: string, attributes?: LogAttributes) => void;
  error: (message: string, attributes?: LogAttributes) => void;
  fatal: (message: string, attributes?: LogAttributes) => void;
}

interface LoggerOptions {
  /** Injectable for tests; defaults to the shared Payload/OTel destination. */
  destination?: { write: (line: string) => void };
  /** Overrides the `LOG_LEVEL` / `NODE_ENV` default. */
  level?: LogLevel;
}

/**
 * Builds a logger bound to a name, which surfaces as `logger.name` in Loki and
 * lets a subsystem be filtered out without touching the others. Use the module or
 * subsystem it logs for, e.g. `createLogger('cache:redis')`.
 */
export const createLogger = (name: string, options: LoggerOptions = {}): ServerLogger => {
  const destination = options.destination ?? otelLogDestination;
  const hostname = os.hostname();
  const pid = process.pid;

  const write = (level: LogLevel, message: string, attributes?: LogAttributes): void => {
    // Read the threshold per call rather than at import: the cache handlers are
    // constructed during the build, long before the runtime environment applies.
    const threshold = options.level ?? configuredLevel();
    if (LEVEL_VALUES[level] < LEVEL_VALUES[threshold]) return;

    const record = {
      level: LEVEL_VALUES[level],
      time: Date.now(),
      pid,
      hostname,
      name,
      msg: message,
      ...(attributes === undefined ? {} : flattenErrors(attributes)),
    };

    let line: string;
    try {
      line = `${JSON.stringify(record)}\n`;
    } catch {
      // A circular attribute must not cost us the message itself.
      line = `${JSON.stringify({ level: LEVEL_VALUES[level], time: Date.now(), pid, hostname, name, msg: message })}\n`;
    }

    try {
      destination.write(line);
    } catch {
      // Logging must never break the caller.
    }
  };

  return {
    trace: (message, attributes) => write('trace', message, attributes),
    debug: (message, attributes) => write('debug', message, attributes),
    info: (message, attributes) => write('info', message, attributes),
    warn: (message, attributes) => write('warn', message, attributes),
    error: (message, attributes) => write('error', message, attributes),
    fatal: (message, attributes) => write('fatal', message, attributes),
  };
};
