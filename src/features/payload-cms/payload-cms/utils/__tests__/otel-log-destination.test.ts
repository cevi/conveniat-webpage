import { createOtelLogDestination } from '@/features/payload-cms/payload-cms/utils/otel-log-destination';
import type { LogAttributes, Logger, LogRecord } from '@opentelemetry/api-logs';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';

describe('otelLogDestination', () => {
  let emitted: LogRecord[] = [];
  let emitThrows = false;
  let written: string[] = [];
  const otelLogDestination = createOtelLogDestination((line) => {
    written.push(line);
  });

  const testLogger: Logger = {
    emit: (record: LogRecord): void => {
      if (emitThrows) throw new Error('exporter down');
      emitted.push(record);
    },
  };

  beforeEach(() => {
    emitted = [];
    emitThrows = false;
    jest.spyOn(logs, 'getLogger').mockReturnValue(testLogger);
    written = [];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const firstRecord = (): LogRecord => {
    const record = emitted[0];
    if (record === undefined) throw new Error('expected a log record to have been emitted');
    return record;
  };

  it('always writes the raw line to the console sink', () => {
    const line = `${JSON.stringify({ level: 30, time: 1, msg: 'hello' })}\n`;
    otelLogDestination.write(line);
    expect(written).toEqual([line]);
  });

  it('emits a log record with body, timestamp and severity', () => {
    otelLogDestination.write(JSON.stringify({ level: 50, time: 1_700_000_000, msg: 'boom' }));

    expect(emitted).toHaveLength(1);
    expect(firstRecord()).toEqual(
      expect.objectContaining({
        body: 'boom',
        timestamp: 1_700_000_000,
        severityNumber: SeverityNumber.ERROR,
        severityText: 'ERROR',
      }),
    );
  });

  it.each([
    [10, SeverityNumber.TRACE, 'TRACE'],
    [20, SeverityNumber.DEBUG, 'DEBUG'],
    [30, SeverityNumber.INFO, 'INFO'],
    [40, SeverityNumber.WARN, 'WARN'],
    [50, SeverityNumber.ERROR, 'ERROR'],
    [60, SeverityNumber.FATAL, 'FATAL'],
  ])('maps pino level %s to the matching OTel severity', (level, number, text) => {
    otelLogDestination.write(JSON.stringify({ level, time: 1, msg: 'x' }));
    const record = firstRecord();
    expect(record.severityNumber).toBe(number);
    expect(record.severityText).toBe(text);
  });

  it('promotes extra fields to attributes and serialises non-primitives', () => {
    otelLogDestination.write(
      JSON.stringify({
        level: 30,
        time: 1,
        msg: 'with context',
        name: 'payload',
        hostname: 'node-a',
        count: 3,
        nested: { a: 1 },
      }),
    );

    const attributes: LogAttributes = firstRecord().attributes ?? {};
    expect(attributes['count']).toBe(3);
    expect(attributes['nested']).toBe('{"a":1}');
    expect(attributes['logger.name']).toBe('payload');
    expect(attributes['host.name']).toBe('node-a');
    // Reserved fields become dedicated OTel concepts, not attributes.
    expect(attributes['msg']).toBeUndefined();
    expect(attributes['level']).toBeUndefined();
  });

  it('does not emit for non-JSON lines but still writes them', () => {
    otelLogDestination.write('plain text log line\n');
    expect(written).toEqual(['plain text log line\n']);
    expect(emitted).toHaveLength(0);
  });

  it('never throws when the logger fails', () => {
    emitThrows = true;
    expect(() =>
      otelLogDestination.write(JSON.stringify({ level: 30, time: 1, msg: 'x' })),
    ).not.toThrow();
  });
});
