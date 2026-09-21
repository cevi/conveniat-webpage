import { runScopedLogger } from '@/features/billing/adapters/payload-logger.adapter';

type Record_ = [Record<string, unknown>, string];

const collectingPayloadLogger = (): {
  records: { level: string; attributes: Record<string, unknown>; message: string }[];
  logger: Record<'debug' | 'info' | 'warn' | 'error', (...arguments_: Record_) => void>;
} => {
  const records: { level: string; attributes: Record<string, unknown>; message: string }[] = [];
  const at =
    (level: string) =>
    (attributes: Record<string, unknown>, message: string): void => {
      records.push({ level, attributes, message });
    };
  return {
    records,
    logger: { debug: at('debug'), info: at('info'), warn: at('warn'), error: at('error') },
  };
};

describe('runScopedLogger', () => {
  it('stamps every record with the run id, whatever the level', () => {
    const { records, logger } = collectingPayloadLogger();
    const scoped = runScopedLogger(logger, 'run-1');

    scoped.debug('walked a batch');
    scoped.info('started');
    scoped.warn('gave up');
    scoped.error('failed');

    expect(records.map((record) => record.level)).toEqual(['debug', 'info', 'warn', 'error']);
    expect(records.every((record) => record.attributes['billing.run_id'] === 'run-1')).toBe(true);
  });

  it('keeps the attributes as fields instead of folding them into the message', () => {
    const { records, logger } = collectingPayloadLogger();

    runScopedLogger(logger, 'run-1').warn('Giving up on a Cevi.DB lookup', {
      'billing.group_id': '4711',
      'billing.attempts': 3,
    });

    expect(records[0]).toEqual({
      level: 'warn',
      message: 'Giving up on a Cevi.DB lookup',
      attributes: {
        'billing.run_id': 'run-1',
        'billing.group_id': '4711',
        'billing.attempts': 3,
      },
    });
  });

  it('hands an error to Pino under `err`, which is the key it serialises', () => {
    const { records, logger } = collectingPayloadLogger();
    const failure = new Error('503 Service Unavailable');

    runScopedLogger(logger, 'run-1').error('Subevent walk failed', {
      'billing.processed_groups': 12,
      error: failure,
    });

    expect(records[0]?.attributes).toEqual({
      'billing.run_id': 'run-1',
      'billing.processed_groups': 12,
      err: failure,
    });
    // The raw key must not survive alongside it, or the record carries the error twice.
    expect(records[0]?.attributes).not.toHaveProperty('error');
  });
});
