import { customPayloadLoggerConfig } from '@/features/payload-cms/payload-cms/utils/job-logger';
import { pino } from 'pino';

/** Logs through pino built from the Payload logger options and returns the parsed record. */
const logLine = (...arguments_: [object, string]): Record<string, unknown> => {
  const lines: string[] = [];
  const logger = pino(customPayloadLoggerConfig.options, {
    write: (line: string) => lines.push(line),
  });
  logger.error(...arguments_);
  return JSON.parse(lines[0] ?? '{}') as Record<string, unknown>;
};

describe('job-logger', () => {
  describe('customPayloadLoggerConfig.options.serializers', () => {
    it('keeps message and stack of an Error logged under `error`', () => {
      const record = logLine({ error: new Error('postgres is down') }, 'Sync failed');

      expect(record['msg']).toBe('Sync failed');
      expect(record['error']).toMatchObject({
        type: 'Error',
        message: 'postgres is down',
        stack: expect.stringContaining('postgres is down') as unknown,
      });
    });

    it('leaves a non-Error value under `error` untouched', () => {
      const record = logLine({ error: 'forbidden' }, 'Lookup failed');

      expect(record['error']).toBe('forbidden');
    });
  });
});
