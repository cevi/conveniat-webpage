jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });
jest.mock('payload', () => ({ getPayload: jest.fn() }));

import { resolveEnrolmentHof } from '@/features/schedule/api/shift-hof';

const userIn = (...hofIds: string[]): Parameters<typeof resolveEnrolmentHof>[0] =>
  ({
    user: { findUnique: jest.fn().mockResolvedValue({ hofIds }) },
  }) as unknown as Parameters<typeof resolveEnrolmentHof>[0];

describe('the Hof a shift enrolment counts for', () => {
  it('is the only Hof of a person in one, without asking', async () => {
    await expect(resolveEnrolmentHof(userIn('uster'), 'u1')).resolves.toBe('uster');
  });

  it('is none for a person in no Hof, like a Helfende or the Kernteam', async () => {
    await expect(resolveEnrolmentHof(userIn(), 'u1')).resolves.toBeNull();
  });

  it('is the one a person in several Höfe chose', async () => {
    await expect(resolveEnrolmentHof(userIn('uster', 'zueri'), 'u1', 'zueri')).resolves.toBe(
      'zueri',
    );
  });

  it('asks a person in several Höfe who did not choose', async () => {
    await expect(resolveEnrolmentHof(userIn('uster', 'zueri'), 'u1')).rejects.toMatchObject({
      reason: 'hofChoiceRequired',
    });
  });

  it('refuses a Hof the person is no longer registered in', async () => {
    await expect(resolveEnrolmentHof(userIn('uster'), 'u1', 'zueri')).rejects.toMatchObject({
      reason: 'notInThisHof',
    });
  });
});
