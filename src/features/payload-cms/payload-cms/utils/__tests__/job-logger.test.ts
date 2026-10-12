import {
  customPayloadLoggerConfig,
  formatRunningJobsLogMessage,
  nodeName,
  setQueriedJobSlugs,
} from '@/features/payload-cms/payload-cms/utils/job-logger';
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
  beforeEach(() => {
    setQueriedJobSlugs([]);
  });

  describe('formatRunningJobsLogMessage', () => {
    it('formats running jobs message with queried job slugs and node name', () => {
      setQueriedJobSlugs(['syncParticipants', 'sendNotification']);
      const formatted = formatRunningJobsLogMessage('Running 2 jobs.');
      expect(formatted).toBe(
        `Running 2 jobs <syncParticipants/${nodeName}, sendNotification/${nodeName}>.`,
      );
    });

    it('falls back to node name when no job slugs are stored', () => {
      const formatted = formatRunningJobsLogMessage('Running 1 job.');
      expect(formatted).toBe(`Running 1 jobs <node:${nodeName}>.`);
    });

    it('resets queried job slugs after formatting', () => {
      setQueriedJobSlugs(['syncParticipants']);
      formatRunningJobsLogMessage('Running 1 job.');
      const secondCall = formatRunningJobsLogMessage('Running 1 job.');
      expect(secondCall).toBe(`Running 1 jobs <node:${nodeName}>.`);
    });

    it('returns unmodified message if regex does not match', () => {
      const message = 'Starting server on port 3000';
      expect(formatRunningJobsLogMessage(message)).toBe(message);
    });
  });

  describe('customPayloadLoggerConfig.options.hooks.logMethod', () => {
    it('enriches string first argument', () => {
      setQueriedJobSlugs(['checkApprovals']);
      const inputArguments: unknown[] = ['Running 1 job.'];
      const spyMethod = jest.fn();

      customPayloadLoggerConfig.options.hooks.logMethod(inputArguments, spyMethod);

      expect(inputArguments[0]).toBe(`Running 1 jobs <checkApprovals/${nodeName}>.`);
      expect(spyMethod).toHaveBeenCalledWith(`Running 1 jobs <checkApprovals/${nodeName}>.`);
    });

    it('enriches object with msg field', () => {
      setQueriedJobSlugs(['checkApprovals']);
      const inputArguments: unknown[] = [{ msg: 'Running 1 job.' }];
      const spyMethod = jest.fn();

      customPayloadLoggerConfig.options.hooks.logMethod(inputArguments, spyMethod);

      expect((inputArguments[0] as { msg: string }).msg).toBe(
        `Running 1 jobs <checkApprovals/${nodeName}>.`,
      );
    });

    it('enriches string second argument when first is an object', () => {
      setQueriedJobSlugs(['checkApprovals']);
      const inputArguments: unknown[] = [{ context: 'test' }, 'Running 1 job.'];
      const spyMethod = jest.fn();

      customPayloadLoggerConfig.options.hooks.logMethod(inputArguments, spyMethod);

      expect(inputArguments[1]).toBe(`Running 1 jobs <checkApprovals/${nodeName}>.`);
    });
  });

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
