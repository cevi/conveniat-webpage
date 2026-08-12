import { createOtelLogDestination } from '@/features/payload-cms/payload-cms/utils/otel-log-destination';
import { createLogger } from '@/utils/server-logger';
import type { Logger, LogRecord } from '@opentelemetry/api-logs';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';

const collector = (): { lines: string[]; write: (line: string) => void } => {
  const lines: string[] = [];
  return { lines, write: (line: string): void => void lines.push(line) };
};

const parse = (line: string): Record<string, unknown> =>
  JSON.parse(line) as Record<string, unknown>;

describe('createLogger', () => {
  it('writes a pino-shaped record the OTel destination understands', () => {
    const destination = collector();
    const logger = createLogger('cache:redis', { destination, level: 'debug' });

    logger.info('Invalidating tags', { 'cache.tags': 'page-1' });

    expect(destination.lines).toHaveLength(1);
    expect(destination.lines[0]?.endsWith('\n')).toBe(true);

    const record = parse(destination.lines[0] ?? '');
    // 30 is pino's `info`; the destination maps the numeric level to a severity.
    expect(record['level']).toBe(30);
    expect(record['msg']).toBe('Invalidating tags');
    expect(record['name']).toBe('cache:redis');
    expect(record['cache.tags']).toBe('page-1');
    expect(typeof record['time']).toBe('number');
  });

  it('maps each level to its pino numeric value', () => {
    const destination = collector();
    const logger = createLogger('test', { destination, level: 'trace' });

    logger.trace('a');
    logger.debug('b');
    logger.info('c');
    logger.warn('d');
    logger.error('e');
    logger.fatal('f');

    expect(destination.lines.map((line) => parse(line)['level'])).toEqual([10, 20, 30, 40, 50, 60]);
  });

  it('drops records below the configured level', () => {
    const destination = collector();
    const logger = createLogger('test', { destination, level: 'info' });

    logger.debug('per-cache-write noise');
    logger.trace('even noisier');
    expect(destination.lines).toHaveLength(0);

    logger.warn('kept');
    expect(destination.lines).toHaveLength(1);
  });

  it('flattens Error attributes, which JSON.stringify would otherwise render as {}', () => {
    const destination = collector();
    const logger = createLogger('test', { destination, level: 'debug' });

    logger.error('SET failed', { 'cache.key': 'k', error: new TypeError('boom') });

    const record = parse(destination.lines[0] ?? '');
    expect(record['error.message']).toBe('boom');
    expect(record['error.name']).toBe('TypeError');
    expect(typeof record['error.stack']).toBe('string');
    expect(record['cache.key']).toBe('k');
  });

  it('still logs the message when an attribute is circular', () => {
    const destination = collector();
    const logger = createLogger('test', { destination, level: 'debug' });

    const circular: Record<string, unknown> = {};
    circular['self'] = circular;

    logger.info('kept', { circular });

    const record = parse(destination.lines[0] ?? '');
    expect(record['msg']).toBe('kept');
    expect(record['circular']).toBeUndefined();
  });

  /**
   * The whole point of the record shape is that the Payload destination can read
   * it, so exercise both halves together rather than trusting the format by eye.
   */
  it('produces records the OTel destination turns into severity-tagged logs', () => {
    const emitted: LogRecord[] = [];
    const stdout: string[] = [];
    jest.spyOn(logs, 'getLogger').mockReturnValue({
      emit: (record: LogRecord): void => void emitted.push(record),
    } satisfies Logger);

    const logger = createLogger('cache:redis', {
      destination: createOtelLogDestination((line) => void stdout.push(line)),
      level: 'debug',
    });

    logger.debug('SET called', { 'cache.key': 'page-1' });

    // stdout keeps working — docker service logs and dozzle depend on it
    expect(stdout).toHaveLength(1);

    const record = emitted[0];
    expect(record?.severityNumber).toBe(SeverityNumber.DEBUG);
    expect(record?.severityText).toBe('DEBUG');
    expect(record?.body).toBe('SET called');
    expect(record?.attributes?.['cache.key']).toBe('page-1');
    expect(record?.attributes?.['logger.name']).toBe('cache:redis');

    jest.restoreAllMocks();
  });

  it('never throws when the destination fails', () => {
    const logger = createLogger('test', {
      destination: {
        write: (): void => {
          throw new Error('exporter down');
        },
      },
      level: 'debug',
    });

    expect(() => logger.error('still fine')).not.toThrow();
  });
});
