jest.mock('@/lib/hitobito', () => ({ HITOBITO_CONFIG: { baseUrl: 'https://db.cevi.test' } }));
jest.mock('@/lib/hitobito/client', () => ({ HitobitoClient: class {} }));

import { keepCeviDatabaseSessionAlive } from '@/features/payload-cms/payload-cms/utils/cevidb-session-keepalive';
import { SessionExpiredError } from '@/lib/hitobito/errors';
import type { Payload } from 'payload';

const setup = (
  browserCookie: string,
): {
  payload: Payload;
  warn: jest.Mock;
  info: jest.Mock;
  flags: { set: jest.Mock; del: jest.Mock };
} => {
  const warn = jest.fn();
  const info = jest.fn();
  const payload = {
    findGlobal: jest.fn().mockResolvedValue({ browserCookie }),
    logger: { warn, info, debug: jest.fn() },
  } as unknown as Payload;
  return {
    payload,
    warn,
    info,
    flags: { set: jest.fn().mockResolvedValue('OK'), del: jest.fn().mockResolvedValue(0) },
  };
};

describe('keepCeviDatabaseSessionAlive', () => {
  it('uses the stored session once', async () => {
    const { payload, flags } = setup('_session_id=abc');
    const ping = jest.fn().mockResolvedValue({});

    expect(await keepCeviDatabaseSessionAlive(payload, flags, ping)).toBe('alive');
    expect(ping).toHaveBeenCalledWith('_session_id=abc');
  });

  it('asks Cevi.DB nothing on a deployment without a cookie', async () => {
    const { payload, flags } = setup('');
    const ping = jest.fn();

    expect(await keepCeviDatabaseSessionAlive(payload, flags, ping)).toBe('no-cookie');
    expect(ping).not.toHaveBeenCalled();
  });

  it('reports an expired session once, not on every run', async () => {
    const { payload, flags, warn } = setup('_session_id=abc');
    const ping = jest.fn().mockRejectedValue(new SessionExpiredError('https://db.cevi.test/'));
    // The second run finds the report already made.
    flags.set.mockResolvedValueOnce('OK').mockResolvedValueOnce('');

    expect(await keepCeviDatabaseSessionAlive(payload, flags, ping)).toBe('expired');
    expect(await keepCeviDatabaseSessionAlive(payload, flags, ping)).toBe('expired');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('says so when a new cookie made the session work again', async () => {
    const { payload, flags, info } = setup('_session_id=new');
    flags.del.mockResolvedValue(1);

    await keepCeviDatabaseSessionAlive(payload, flags, jest.fn().mockResolvedValue({}));

    expect(info).toHaveBeenCalledTimes(1);
  });

  it('does not call the session expired when Cevi.DB cannot be reached', async () => {
    const { payload, flags, warn } = setup('_session_id=abc');
    const ping = jest.fn().mockRejectedValue(new Error('fetch failed'));

    expect(await keepCeviDatabaseSessionAlive(payload, flags, ping)).toBe('unreachable');
    expect(flags.set).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
