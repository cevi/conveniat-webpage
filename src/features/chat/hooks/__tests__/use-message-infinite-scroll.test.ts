import { keepNewestPages } from '@/features/chat/hooks/use-message-infinite-scroll';

jest.mock('@/trpc/client', () => ({ trpc: {} }));

describe('keepNewestPages', () => {
  it('keeps the newest pages and their cursors, which a reopened chat starts from', () => {
    const data = {
      pages: ['newest', 'older', 'oldest'],
      pageParams: [undefined, 'cursor-1', 'cursor-2'],
    };

    expect(keepNewestPages(data, 2)).toEqual({
      pages: ['newest', 'older'],
      pageParams: [undefined, 'cursor-1'],
    });
  });
});
