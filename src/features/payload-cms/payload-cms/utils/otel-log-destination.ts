import type { LogAttributes } from '@opentelemetry/api-logs';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';

/**
 * Pino destination that tees every log line to stdout and into the OpenTelemetry
 * log pipeline.
 *
 * This deliberately does NOT use `@opentelemetry/instrumentation-pino`. That
 * instrumentation patches the `pino` module through `require-in-the-middle`,
 * which only sees packages resolved by Node's real `require`. Next.js bundles
 * `pino` into the standalone server output — `require.resolve('pino')` fails
 * inside the built image — so the instrumentation silently patches nothing and
 * no log record is ever emitted. Owning the destination stream sidesteps module
 * resolution entirely and cannot be defeated by bundling.
 *
 * Records are emitted through the global LoggerProvider registered by the SDK in
 * `@/tracing`. Emitting picks up the active context, so each record carries the
 * `trace_id` / `span_id` of the request that produced it — which is what makes
 * the trace ↔ log links in Grafana resolve.
 */

/** Pino numeric levels, highest first so the first match wins. */
const PINO_LEVEL_TO_SEVERITY: { minLevel: number; number: SeverityNumber; text: string }[] = [
  { minLevel: 60, number: SeverityNumber.FATAL, text: 'FATAL' },
  { minLevel: 50, number: SeverityNumber.ERROR, text: 'ERROR' },
  { minLevel: 40, number: SeverityNumber.WARN, text: 'WARN' },
  { minLevel: 30, number: SeverityNumber.INFO, text: 'INFO' },
  { minLevel: 20, number: SeverityNumber.DEBUG, text: 'DEBUG' },
  { minLevel: 10, number: SeverityNumber.TRACE, text: 'TRACE' },
];

const severityFor = (level: unknown): { number: SeverityNumber; text: string } => {
  const numericLevel = typeof level === 'number' ? level : Number.NaN;
  const match = PINO_LEVEL_TO_SEVERITY.find((entry) => numericLevel >= entry.minLevel);
  return match ?? { number: SeverityNumber.UNSPECIFIED, text: 'UNSPECIFIED' };
};

/** Fields that become dedicated OTel concepts rather than free-form attributes. */
const RESERVED_FIELDS = new Set(['level', 'time', 'msg', 'pid', 'hostname', 'name']);

const toAttributes = (record: Record<string, unknown>): LogAttributes => {
  const attributes: LogAttributes = {};

  for (const [key, value] of Object.entries(record)) {
    if (RESERVED_FIELDS.has(key) || value === undefined) continue;

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      attributes[key] = value satisfies LogAttributes[string];
    } else {
      // Objects and arrays are not valid attribute values; keep them queryable
      // as JSON rather than dropping the information.
      try {
        attributes[key] = JSON.stringify(value);
      } catch {
        // Circular structure — not worth failing a log line over.
      }
    }
  }

  // Payload's logger name is useful for filtering in Loki.
  if (typeof record['name'] === 'string') attributes['logger.name'] = record['name'];
  if (typeof record['hostname'] === 'string') attributes['host.name'] = record['hostname'];

  return attributes;
};

export const otelLogDestination = {
  write(line: string): void {
    // Always preserve stdout: `docker service logs` and dozzle depend on it, and
    // it must keep working even if the OTLP exporter is unreachable.
    process.stdout.write(line);

    let record: Record<string, unknown>;
    try {
      record = JSON.parse(line) as Record<string, unknown>;
    } catch {
      // Not JSON (pino-pretty in local dev, or a partial write) — stdout already
      // has it, so there is nothing more to do.
      return;
    }

    const severity = severityFor(record['level']);
    const timestamp = typeof record['time'] === 'number' ? record['time'] : Date.now();
    const body = typeof record['msg'] === 'string' ? record['msg'] : line.trim();

    try {
      logs.getLogger('payload').emit({
        timestamp,
        severityNumber: severity.number,
        severityText: severity.text,
        body,
        attributes: toAttributes(record),
      });
    } catch {
      // Never let telemetry break application logging. Before the SDK starts the
      // logs API returns a no-op logger, so this is only a guard against an
      // exporter throwing synchronously.
    }
  },
};
