import {
  installConsoleOtelBridge,
  resetConsoleOtelBridgeForTesting,
} from '@/utils/otel-console-bridge';
import type { Logger, LogRecord } from '@opentelemetry/api-logs';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';

describe('otel console bridge', () => {
  let emitted: LogRecord[] = [];
  let printed: unknown[][] = [];
  let onEmit: ((record: LogRecord) => void) | undefined;

  const testLogger: Logger = {
    emit: (record: LogRecord): void => {
      emitted.push(record);
      onEmit?.(record);
    },
  };

  const recordCall =
    (method: string) =>
    (...parameters: unknown[]): void => {
      printed.push([method, ...parameters]);
    };

  /** A stand-in console so the test runner's own output is untouched. */
  const makeConsole = (): Console => {
    const record = recordCall;
    return {
      log: record('log'),
      info: record('info'),
      warn: record('warn'),
      error: record('error'),
      debug: record('debug'),
      trace: record('trace'),
    } as unknown as Console;
  };

  beforeEach(() => {
    emitted = [];
    printed = [];
    onEmit = undefined;
    resetConsoleOtelBridgeForTesting();
    jest.spyOn(logs, 'getLogger').mockReturnValue(testLogger);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('still prints to the console', () => {
    const fake = makeConsole();
    installConsoleOtelBridge(fake);

    fake.error('hello', 42);

    expect(printed).toEqual([['error', 'hello', 42]]);
  });

  it.each(['log', 'info', 'debug', 'trace'])(
    'does not ship console.%s to Loki — it is noise, not signal',
    (method) => {
      const fake = makeConsole();
      installConsoleOtelBridge(fake);

      (fake[method as 'log'] as (...a: unknown[]) => void)('Generate metadata for page');

      // Still printed to stdout, just not stored.
      expect(printed).toHaveLength(1);
      expect(emitted).toHaveLength(0);
    },
  );

  it.each([
    ['error', SeverityNumber.ERROR, 'ERROR'],
    ['warn', SeverityNumber.WARN, 'WARN'],
  ])('maps console.%s to the matching severity', (method, number, text) => {
    const fake = makeConsole();
    installConsoleOtelBridge(fake);

    (fake[method as 'log'] as (...a: unknown[]) => void)('x');

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.severityNumber).toBe(number);
    expect(emitted[0]?.severityText).toBe(text);
  });

  it('formats arguments the way the console does', () => {
    const fake = makeConsole();
    installConsoleOtelBridge(fake);

    fake.error('count is %d for %s', 7, 'redis');
    fake.error({ a: 1 });

    expect(emitted[0]?.body).toBe('count is 7 for redis');
    expect(emitted[1]?.body).toContain('a: 1');
  });

  it('tags records so console output is distinguishable in Loki', () => {
    const fake = makeConsole();
    installConsoleOtelBridge(fake);

    fake.warn('careful');

    expect(emitted[0]?.attributes).toEqual(
      expect.objectContaining({ 'log.source': 'console', 'log.method': 'warn' }),
    );
  });

  it('does not recurse when the exporter logs through the console', () => {
    const fake = makeConsole();
    installConsoleOtelBridge(fake);

    // Simulates OpenTelemetry's DiagConsoleLogger reporting an export failure
    // while we are handling a console call. Without a re-entrancy guard this
    // recurses until the stack overflows.
    onEmit = (): void => {
      fake.error('exporter failed');
    };

    expect(() => fake.error('trigger')).not.toThrow();
    expect(emitted).toHaveLength(1);
  });

  it('never throws when the logger fails', () => {
    const fake = makeConsole();
    installConsoleOtelBridge(fake);
    onEmit = (): void => {
      throw new Error('exporter down');
    };

    expect(() => fake.error('boom')).not.toThrow();
    expect(printed).toEqual([['error', 'boom']]);
  });

  it('can be widened with OTEL_CONSOLE_CAPTURE_LEVELS for debugging', () => {
    // eslint-disable-next-line n/no-process-env
    process.env['OTEL_CONSOLE_CAPTURE_LEVELS'] = 'error,warn,info';
    try {
      const fake = makeConsole();
      installConsoleOtelBridge(fake);

      fake.info('now captured');

      expect(emitted).toHaveLength(1);
      expect(emitted[0]?.severityText).toBe('INFO');
    } finally {
      // eslint-disable-next-line n/no-process-env
      delete process.env['OTEL_CONSOLE_CAPTURE_LEVELS'];
    }
  });

  it('ignores unrecognised levels and keeps the safe default', () => {
    // eslint-disable-next-line n/no-process-env
    process.env['OTEL_CONSOLE_CAPTURE_LEVELS'] = 'nonsense';
    try {
      const fake = makeConsole();
      installConsoleOtelBridge(fake);

      fake.log('still noise');
      fake.error('still signal');

      expect(emitted).toHaveLength(1);
      expect(emitted[0]?.severityText).toBe('ERROR');
    } finally {
      // eslint-disable-next-line n/no-process-env
      delete process.env['OTEL_CONSOLE_CAPTURE_LEVELS'];
    }
  });

  it('is idempotent so a second install cannot double-emit', () => {
    const fake = makeConsole();
    installConsoleOtelBridge(fake);
    installConsoleOtelBridge(fake);

    fake.error('once');

    expect(emitted).toHaveLength(1);
    expect(printed).toHaveLength(1);
  });
});
