/**
 * @jest-environment jsdom
 */

import { useSafetyRiskAnswer } from '@/features/hof-dashboard/hooks/use-safety-risk-answer';
import { trpc } from '@/trpc/client';
import { renderHook } from '@testing-library/react';

jest.mock('@/trpc/client', () => ({
  trpc: {
    useUtils: jest.fn(),
    hofDashboard: { updateSafetyRisk: { useMutation: jest.fn() } },
  },
}));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

interface Cached {
  submissions: { type: string; elevatedSafetyRisk?: 'yes' | 'no' }[];
}
interface Options {
  onMutate: (answer: { submissionType: string; elevatedSafetyRisk: 'yes' | 'no' }) => Promise<{
    previous: Cached | undefined;
  }>;
  onError: (error: unknown, answer: unknown, context: { previous: Cached | undefined }) => void;
}

/** The dashboard as the query cache holds it, and the options the hook gave the mutation. */
const setUp = (): { cache: { data: Cached | undefined }; options: () => Options } => {
  const cache: { data: Cached | undefined } = {
    data: { submissions: [{ type: 'hofBuildings' }, { type: 'flagpole' }] },
  };
  (trpc.useUtils as unknown as jest.Mock).mockReturnValue({
    hofDashboard: {
      getHofDashboard: {
        cancel: jest.fn(),
        invalidate: jest.fn(),
        getData: () => cache.data,
        setData: (_input: unknown, update: Cached | ((current: Cached | undefined) => Cached)) => {
          cache.data = typeof update === 'function' ? update(cache.data) : update;
        },
      },
    },
  });
  jest
    .mocked(trpc.hofDashboard.updateSafetyRisk.useMutation)
    .mockReturnValue({ mutate: jest.fn() } as never);
  renderHook(() => useSafetyRiskAnswer('hof-nord', 'de'));
  const options = (): Options =>
    jest.mocked(trpc.hofDashboard.updateSafetyRisk.useMutation).mock
      .calls[0]?.[0] as unknown as Options;
  return { cache, options };
};

describe('useSafetyRiskAnswer', () => {
  it('shows the answer before the server has it', async () => {
    const { cache, options } = setUp();
    await options().onMutate({ submissionType: 'hofBuildings', elevatedSafetyRisk: 'yes' });
    expect(cache.data?.submissions[0]?.elevatedSafetyRisk).toBe('yes');
    expect(cache.data?.submissions[1]?.elevatedSafetyRisk).toBeUndefined();
  });

  it('puts the previous answer back when saving fails', async () => {
    const { cache, options } = setUp();
    const context = await options().onMutate({
      submissionType: 'hofBuildings',
      elevatedSafetyRisk: 'yes',
    });
    options().onError(new Error('offline'), undefined, context);
    expect(cache.data?.submissions[0]?.elevatedSafetyRisk).toBeUndefined();
  });

  it('sends the answers of one Hof one after the other', () => {
    const { options } = setUp();
    expect(options()).toMatchObject({ scope: { id: 'hof-safety-risk-hof-nord' } });
  });
});
