import {
  customPayloadLoggerConfig,
  formatRunningJobsLogMessage,
  nodeName,
  setQueriedJobSlugs,
} from '@/features/payload-cms/payload-cms/utils/job-logger';

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
});
