/**
 * @jest-environment jsdom
 */

import { loadPostHog } from '@/lib/posthog-client';

const posthog = {
  // The first start fails like a chunk that cannot be fetched offline.
  init: jest.fn().mockImplementationOnce(() => {
    throw new Error('Failed to fetch dynamically imported module');
  }),
  register: jest.fn(),
  unregister: jest.fn(),
  has_opted_in_capturing: (): boolean => false,
  has_opted_out_capturing: (): boolean => true,
};

jest.mock('posthog-js', () => ({ __esModule: true, default: posthog }));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { NEXT_PUBLIC_POSTHOG_KEY: 'phc_test' },
}));
jest.mock('@/build', () => ({
  __esModule: true,
  default: { version: '0.0.0', git: { hash: 'test' } },
}));

describe('starting PostHog without a connection', () => {
  it('fails quietly and starts on a later attempt', async () => {
    await expect(loadPostHog()).resolves.toBeUndefined();
    await expect(loadPostHog()).resolves.toBe(posthog);
    expect(posthog.init).toHaveBeenCalledTimes(2);
  });
});
