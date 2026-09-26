import { createAuthJsLogger } from '@/features/next-auth/utils/auth-js-logger';
import { createLogger } from '@/utils/server-logger';

/**
 * `next-auth` is ESM-only and cannot be imported for a value under Jest, so the shape its
 * `AuthError` produces is rebuilt here: the `type`, the `name`, and the docs link its constructor
 * appends to the message.
 */
class UnknownAction extends Error {
  readonly type = 'UnknownAction';

  constructor(message: string) {
    super(`${message}. Read more at https://errors.authjs.dev#unknownaction`);
    this.name = 'UnknownAction';
  }
}

const collector = (): { lines: string[]; write: (line: string) => void } => {
  const lines: string[] = [];
  return { lines, write: (line: string): void => void lines.push(line) };
};

const records = (lines: string[]): Record<string, unknown>[] =>
  lines.map((line) => JSON.parse(line) as Record<string, unknown>);

const build = (): { lines: string[]; logger: ReturnType<typeof createAuthJsLogger> } => {
  const destination = collector();
  return {
    lines: destination.lines,
    logger: createAuthJsLogger(createLogger('next-auth', { destination, level: 'debug' })),
  };
};

describe('createAuthJsLogger', () => {
  it('writes a scanner probe at debug with the probed path and no stack', () => {
    const { lines, logger } = build();

    logger.error?.(new UnknownAction('Cannot parse action at /api/auth/v1/pin/verify'));

    const [record] = records(lines);
    // 20 is pino's `debug`, so the probe never reaches the error rate.
    expect(record?.['level']).toBe(20);
    expect(record?.['auth.error']).toBe('UnknownAction');
    expect(record?.['url.path']).toBe('/api/auth/v1/pin/verify');
    expect(record?.['error.stack']).toBeUndefined();
  });

  it('writes any other Auth.js error at error with its type and the error attached', () => {
    const { lines, logger } = build();

    logger.error?.(new Error('Hitobito rejected the authorization code'));

    const [record] = records(lines);
    // 50 is pino's `error`.
    expect(record?.['level']).toBe(50);
    expect(record?.['auth.error']).toBe('Error');
    expect(record?.['msg']).toBe('Hitobito rejected the authorization code');
    expect(record?.['error.message']).toBe('Hitobito rejected the authorization code');
  });

  it('drops the docs link Auth.js appends to every message', () => {
    const { lines, logger } = build();

    logger.error?.(new UnknownAction('Cannot parse action at /api/auth/*'));

    expect(lines.join('')).not.toContain('errors.authjs.dev');
  });

  it('writes a warning code at warn', () => {
    const { lines, logger } = build();

    logger.warn?.('debug-enabled');

    const [record] = records(lines);
    // 40 is pino's `warn`.
    expect(record?.['level']).toBe(40);
    expect(record?.['auth.warning']).toBe('debug-enabled');
  });
});
