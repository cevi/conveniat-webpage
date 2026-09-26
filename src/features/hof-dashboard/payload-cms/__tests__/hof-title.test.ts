import { refreshHofTitles } from '@/features/hof-dashboard/payload-cms/hof-title';
import type { Hof } from '@/features/payload-cms/payload-types';

type HookArguments = Parameters<typeof refreshHofTitles>[0];

const hof = (name: string): Hof => ({
  id: 'hof-nord',
  name,
  groupId: '990001',
  createdAt: '',
  updatedAt: '',
});

const rename = async (from: string, to: string): Promise<jest.Mock> => {
  const update = jest.fn(() => Promise.resolve({ docs: [] }));
  await refreshHofTitles({
    doc: hof(to),
    previousDoc: hof(from),
    operation: 'update',
    req: { payload: { update } },
  } as unknown as HookArguments);
  return update;
};

describe('refreshHofTitles', () => {
  it("saves the Hof's submissions and orders again when it is renamed", async () => {
    const update = await rename('Hof Nord', 'Hof Nordwest');
    expect(
      update.mock.calls.map(([options]: [{ collection: string }]) => options.collection),
    ).toEqual(['hof-submissions', 'hof-material-orders']);
  });

  it('leaves them alone when the name stays', async () => {
    const update = await rename('Hof Nord', 'Hof Nord');
    expect(update).not.toHaveBeenCalled();
  });
});
