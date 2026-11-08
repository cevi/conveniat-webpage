import type { StoryFigure } from '@/features/payload-cms/payload-types';
import { syncDeletedFigureImageVisibility } from '@/features/story/payload-cms/story-image-visibility';
import type { PayloadRequest } from 'payload';

/** A request whose `payload` knows which figures still show the picture, and records updates. */
const requestWith = (
  remaining: { visibleFrom?: string | null }[],
): { request: PayloadRequest; updates: unknown[] } => {
  const updates: unknown[] = [];
  const payload = {
    find: (): Promise<{ docs: { visibleFrom?: string | null }[] }> =>
      Promise.resolve({ docs: remaining }),
    update: (arguments_: { data: unknown }): Promise<void> => {
      updates.push(arguments_.data);
      return Promise.resolve();
    },
  };
  return { request: { payload } as unknown as PayloadRequest, updates };
};

const deleteFigure = async (request: PayloadRequest, photo: string | null): Promise<void> => {
  await syncDeletedFigureImageVisibility({
    doc: { id: 'gone', photo } as unknown as StoryFigure,
    req: request,
  } as Parameters<typeof syncDeletedFigureImageVisibility>[0]);
};

describe('a picture after its figure is deleted', () => {
  it('follows the figure still to come that shares it', async () => {
    const { request, updates } = requestWith([{ visibleFrom: '2027-07-29T19:00:00.000Z' }]);
    await deleteFigure(request, 'picture');
    expect(updates).toEqual([{ visibleFrom: '2027-07-29T19:00:00.000Z' }]);
  });

  it('is hidden again once no figure shows it', async () => {
    const { request, updates } = requestWith([]);
    await deleteFigure(request, 'picture');
    expect(updates).toEqual([{ visibleFrom: null }]);
  });

  it('is left alone when the figure had none', async () => {
    const { request, updates } = requestWith([]);
    await deleteFigure(request, null);
    expect(updates).toEqual([]);
  });
});
