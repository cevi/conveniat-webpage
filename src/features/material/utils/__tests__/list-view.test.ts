import {
  ariaSort,
  bulkEligible,
  loanRowActions,
  nextSort,
  pageLinks,
  pageWindow,
  rangeBetween,
  selectionState,
  sortRows,
  summariseBulk,
  type SortState,
} from '@/features/material/utils/list-view';

describe('nextSort', () => {
  it('cycles ascending, descending, then back to the original order', () => {
    const first = nextSort(undefined, 'name');
    expect(first).toEqual({ key: 'name', direction: 'ascending' });
    const second = nextSort(first, 'name');
    expect(second).toEqual({ key: 'name', direction: 'descending' });
    expect(nextSort(second, 'name')).toBeUndefined();
  });

  it('starts ascending on another column', () => {
    expect(nextSort({ key: 'name', direction: 'descending' }, 'date')).toEqual({
      key: 'date',
      direction: 'ascending',
    });
  });

  it('reports aria-sort only for the sorted column', () => {
    const sort: SortState<'name' | 'date'> = { key: 'name', direction: 'descending' };
    expect(ariaSort(sort, 'name')).toBe('descending');
    expect(ariaSort(sort, 'date')).toBe('none');
  });
});

describe('sortRows', () => {
  const rows = [
    { name: 'b', n: 1 },
    { name: 'a', n: 2 },
    { name: 'b', n: 3 },
  ];
  type Row = (typeof rows)[number];
  const comparators = {
    name: (x: Row, y: Row): number => x.name.localeCompare(y.name),
  };

  it('keeps the original order without a sort', () => {
    expect(sortRows(rows, undefined, comparators).map((row) => row.n)).toEqual([1, 2, 3]);
  });

  it('sorts stably in both directions', () => {
    expect(
      sortRows(rows, { key: 'name', direction: 'ascending' }, comparators).map((row) => row.n),
    ).toEqual([2, 1, 3]);
    expect(
      sortRows(rows, { key: 'name', direction: 'descending' }, comparators).map((row) => row.n),
    ).toEqual([1, 3, 2]);
  });
});

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

describe('selection', () => {
  it('turns from none to some to all', () => {
    const ids = ['a', 'b', 'c'];
    expect(selectionState(ids, new Set())).toBe('none');
    expect(selectionState(ids, new Set(['b', 'x']))).toBe('some');
    expect(selectionState(ids, new Set(['a', 'b', 'c']))).toBe('all');
  });

  it('selects a shift-click range in either direction', () => {
    const ids = ['a', 'b', 'c', 'd'];
    expect(rangeBetween(ids, 'b', 'd')).toEqual(['b', 'c', 'd']);
    expect(rangeBetween(ids, 'd', 'b')).toEqual(['b', 'c', 'd']);
    expect(rangeBetween(ids, 'gone', 'c')).toEqual(['c']);
  });
});

describe('bulk actions', () => {
  const loans = [
    { id: '1', status: 'REQUESTED' as const },
    { id: '2', status: 'RESERVED' as const },
    { id: '3', status: 'ISSUED' as const },
  ];

  it('confirms only requests', () => {
    expect(bulkEligible('confirm', loans)).toEqual({ ids: ['1'], skipped: 2 });
  });

  it('hands out requests and reservations', () => {
    expect(bulkEligible('issue', loans)).toEqual({ ids: ['1', '2'], skipped: 1 });
  });

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

describe('loanRowActions', () => {
  it('puts the counter step first for the material team', () => {
    expect(loanRowActions({ status: 'REQUESTED' }, true)[0]).toBe('confirm');
    expect(loanRowActions({ status: 'RESERVED' }, true)[0]).toBe('issue');
    expect(loanRowActions({ status: 'ISSUED' }, true)[0]).toBe('return');
  });

  it('gives a participant no counter steps', () => {
    expect(loanRowActions({ status: 'ISSUED' }, false)).toEqual(['view', 'incident']);
    expect(loanRowActions({ status: 'RETURNED' }, false)).toEqual(['view']);
  });
});
