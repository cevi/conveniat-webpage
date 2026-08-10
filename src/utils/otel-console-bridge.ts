import type { LogAttributes } from '@opentelemetry/api-logs';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { format } from 'node:util';

/**
 * Mirrors `console.*` output into the OpenTelemetry log pipeline.
 *
 * Payload's own logger reaches Loki through the pino destination in
 * `@/features/payload-cms/payload-cms/utils/otel-log-destination`, but the
 * application logs far more through plain `console.*` — roughly 585 call sites.
 * Rewriting those to a shared logger would be a large, risky change; patching
 * the console once captures all of them and any added later.
 *
 * The original console method is always called first, so stdout behaviour is
 * unchanged and a broken exporter can never cost us console output.
 */

type ConsoleMethod = 'debug' | 'error' | 'info' | 'log' | 'trace' | 'warn';

const SEVERITY_BY_METHOD: Record<ConsoleMethod, { number: SeverityNumber; text: string }> = {
  error: { number: SeverityNumber.ERROR, text: 'ERROR' },
  warn: { number: SeverityNumber.WARN, text: 'WARN' },
  info: { number: SeverityNumber.INFO, text: 'INFO' },
  log: { number: SeverityNumber.INFO, text: 'INFO' },
  debug: { number: SeverityNumber.DEBUG, text: 'DEBUG' },
  trace: { number: SeverityNumber.TRACE, text: 'TRACE' },
};

const METHODS = Object.keys(SEVERITY_BY_METHOD) as ConsoleMethod[];

/**
 * Guards against infinite recursion.
 *
 * OpenTelemetry's own diagnostics go through `console` (see `DiagConsoleLogger`
 * in `@/tracing`). Without this, an exporter warning emitted while handling a
 * console call would re-enter this bridge and recurse until the stack blows.
 */
let emitting = false;

let installed = false;

const emitRecord = (method: ConsoleMethod, parameters: unknown[]): void => {
  if (emitting) return;
  emitting = true;

  try {
    const severity = SEVERITY_BY_METHOD[method];
    const attributes: LogAttributes = { 'log.source': 'console', 'log.method': method };

    // `format` reproduces exactly what the console printed, including %s/%d
    // substitution and object inspection, so the record body matches stdout.
    logs.getLogger('console').emit({
      severityNumber: severity.number,
      severityText: severity.text,
      body: format(...parameters),
      attributes,
    });
  } catch {
    // Telemetry must never break application logging.
  } finally {
    emitting = false;
  }
};

/**
 * Patches the given console in place. Idempotent.
 *
 * `target` is injectable so tests can exercise the patch without touching the
 * real console, which would swallow the test runner's own output.
 */
export const installConsoleOtelBridge = (target: Console = console): void => {
  if (installed) return;
  installed = true;

  for (const method of METHODS) {
    const original = target[method].bind(target) as (...parameters: unknown[]) => void;

    target[method] = (...parameters: unknown[]): void => {
      // Always emit to the console first: stdout is the fallback that must keep
      // working regardless of the state of the OTLP pipeline.
      original(...parameters);
      emitRecord(method, parameters);
    };
  }
};

/** Test helper — allows a fresh install between cases. */
export const resetConsoleOtelBridgeForTesting = (): void => {
  installed = false;
  emitting = false;
};
