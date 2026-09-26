import { pageLinks, pageWindow, summariseBulk } from '@/features/material/utils/list-view';

describe('pageWindow', () => {
  it('shows one page of rows', () => {
    expect(pageWindow({ total: 132, page: 2, pageSize: 25 })).toEqual({
      page: 2,
      pageCount: 6,
      start: 25,
      end: 50,
      hasPrevious: true,
      hasMore: true,
    });
  });

  it('ends the last page at the last row', () => {
    const window = pageWindow({ total: 132, page: 6, pageSize: 25 });
    expect([window.start, window.end, window.hasMore]).toEqual([125, 132, false]);
  });

  it('clamps a page that no longer exists after filtering', () => {
    const window = pageWindow({ total: 10, page: 4, pageSize: 25 });
    expect([window.page, window.start, window.end]).toEqual([1, 0, 10]);
  });

  it('grows the window when more pages are loaded', () => {
    const window = pageWindow({ total: 132, page: 1, pageSize: 25, loaded: 3 });
    expect([window.start, window.end, window.hasMore]).toEqual([0, 75, true]);
  });

  it('has a single empty page for an empty list', () => {
    expect(pageWindow({ total: 0, page: 1, pageSize: 25 })).toMatchObject({
      pageCount: 1,
      start: 0,
      end: 0,
      hasMore: false,
    });
  });
});

describe('pageLinks', () => {
  it('lists every page when there are few', () => {
    expect(pageLinks(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('collapses long ranges around the current page', () => {
    expect(pageLinks(10, 20)).toEqual([1, 'ellipsis-start', 9, 10, 11, 'ellipsis-end', 20]);
  });

  it('shows a single hidden page instead of an ellipsis', () => {
    expect(pageLinks(4, 20)).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 20]);
  });

  it('handles a single page', () => {
    expect(pageLinks(1, 1)).toEqual([1]);
  });
});

describe('summariseBulk', () => {
  it('counts results and keeps distinct reasons', () => {
    expect(
      summariseBulk([
        { id: '1', ok: true },
        { id: '2', ok: false, error: 'Not on shelf' },
        { id: '3', ok: false, error: 'Not on shelf' },
      ]),
    ).toEqual({ done: 1, failed: 2, errors: ['Not on shelf'] });
  });
});
