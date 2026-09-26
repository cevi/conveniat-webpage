import type { MaterialLoanStatus } from '@/lib/prisma/client';

export type SortDirection = 'ascending' | 'descending';

/** A column sort, or none: the list keeps the order it came in. */
export type SortState<Key extends string> = { key: Key; direction: SortDirection } | undefined;

/**
 * The next sort after a click on a column header. Three states, not two: ascending, then
 * descending, then back to the list's own order, which a two-state toggle could never restore.
 */
export const nextSort = <Key extends string>(current: SortState<Key>, key: Key): SortState<Key> => {
  if (current?.key !== key) return { key, direction: 'ascending' };
  if (current.direction === 'ascending') return { key, direction: 'descending' };
  return undefined;
};

/** The value for a header's `aria-sort`. */
export const ariaSort = <Key extends string>(
  sort: SortState<Key>,
  key: Key,
): 'ascending' | 'descending' | 'none' => (sort?.key === key ? sort.direction : 'none');

/**
 * Sorts by a column, stable, so rows that compare equal keep the list's own order. Without a
 * sort the rows come back unchanged.
 */
export const sortRows = <Row, Key extends string>(
  rows: readonly Row[],
  sort: SortState<Key>,
  comparators: Record<Key, (a: Row, b: Row) => number>,
): Row[] => {
  if (sort === undefined) return [...rows];
  const compare = comparators[sort.key];
  const sign = sort.direction === 'ascending' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index }))
    .toSorted((a, b) => {
      const order = sign * compare(a.row, b.row);
      return order === 0 ? a.index - b.index : order;
    })
    .map(({ row }) => row);
};

export const PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export interface PageWindow {
  /** first page of the window, 1-based and clamped to what exists */
  page: number;
  pageCount: number;
  /** index of the first row shown, and one past the last */
  start: number;
  end: number;
  hasPrevious: boolean;
  hasMore: boolean;
}

/**
 * The rows a list shows. A window starts at `page` and spans `loaded` pages: numbered
 * pagination keeps one page, "load more" on a phone grows the window instead of replacing it.
 */
export const pageWindow = ({
  total,
  page,
  pageSize,
  loaded = 1,
}: {
  total: number;
  page: number;
  pageSize: number;
  loaded?: number;
}): PageWindow => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = Math.min(Math.max(1, Math.floor(page)), pageCount);
  const span = Math.max(1, Math.floor(loaded));
  const start = (first - 1) * pageSize;
  const end = Math.min(total, start + span * pageSize);
  return { page: first, pageCount, start, end, hasPrevious: first > 1, hasMore: end < total };
};

export type PageLink = number | 'ellipsis-start' | 'ellipsis-end';

/**
 * The page numbers worth a link: the first, the last, the current one and its neighbours,
 * with an ellipsis for every gap. A gap of one page shows the page instead, since the
 * ellipsis would take the same room.
 */
export const pageLinks = (page: number, pageCount: number, siblings = 1): PageLink[] => {
  const shown = new Set<number>([1, pageCount]);
  for (let offset = -siblings; offset <= siblings; offset += 1) {
    const candidate = page + offset;
    if (candidate >= 1 && candidate <= pageCount) shown.add(candidate);
  }
  const sorted = [...shown].toSorted((a, b) => a - b);
  const links: PageLink[] = [];
  for (const [index, value] of sorted.entries()) {
    const previous = sorted[index - 1];
    if (previous !== undefined && value - previous === 2) links.push(previous + 1);
    else if (previous !== undefined && value - previous > 2) {
      links.push(value < page ? 'ellipsis-start' : 'ellipsis-end');
    }
    links.push(value);
  }
  return links;
};

/** The header checkbox of a page: empty, a dash for some, ticked for all. */
export const selectionState = (
  pageIds: readonly string[],
  selected: ReadonlySet<string>,
): 'none' | 'some' | 'all' => {
  const count = pageIds.filter((id) => selected.has(id)).length;
  if (count === 0) return 'none';
  return count === pageIds.length ? 'all' : 'some';
};

/** Ids between two rows of a page, both included, for a shift-click range. */
export const rangeBetween = (ids: readonly string[], from: string, to: string): string[] => {
  const a = ids.indexOf(from);
  const b = ids.indexOf(to);
  if (a === -1 || b === -1) return b === -1 ? [] : [to];
  return ids.slice(Math.min(a, b), Math.max(a, b) + 1);
};

export type BulkLoanAction = 'confirm' | 'issue';

const BULK_STATUSES: Record<BulkLoanAction, ReadonlySet<MaterialLoanStatus>> = {
  confirm: new Set(['REQUESTED']),
  issue: new Set(['REQUESTED', 'RESERVED']),
};

/** Whether a bulk action applies to a loan: confirm a request, hand out what is booked. */
export const canBulk = (action: BulkLoanAction, loan: { status: MaterialLoanStatus }): boolean =>
  BULK_STATUSES[action].has(loan.status);

/** The selected loans a bulk action would touch, and how many it would leave alone. */
export const bulkEligible = <Loan extends { id: string; status: MaterialLoanStatus }>(
  action: BulkLoanAction,
  loans: readonly Loan[],
): { ids: string[]; skipped: number } => {
  const ids = loans.filter((loan) => canBulk(action, loan)).map((loan) => loan.id);
  return { ids, skipped: loans.length - ids.length };
};

export interface BulkResult {
  id: string;
  ok: boolean;
  error?: string;
}

/** "3 done, 1 failed", and the distinct reasons for the failures. */
export const summariseBulk = (
  results: readonly BulkResult[],
): { done: number; failed: number; errors: string[] } => {
  const failures = results.filter((result) => !result.ok);
  return {
    done: results.length - failures.length,
    failed: failures.length,
    errors: [...new Set(failures.map((result) => result.error ?? ''))].filter(
      (error) => error !== '',
    ),
  };
};

export type LoanRowAction = 'confirm' | 'issue' | 'return' | 'edit' | 'incident' | 'qr' | 'view';

/**
 * What can be done with a loan from a list, the counter's next step first. The first entry is
 * the row's button, the rest go into its menu. Only the material team runs the counter.
 */
export const loanRowActions = (
  loan: { status: MaterialLoanStatus },
  isMaterialTeam: boolean,
): LoanRowAction[] => {
  const pending = loan.status === 'REQUESTED' || loan.status === 'RESERVED';
  const out = loan.status === 'ISSUED';
  const actions: LoanRowAction[] = [];
  if (isMaterialTeam) {
    if (loan.status === 'REQUESTED') actions.push('confirm');
    if (pending) actions.push('issue');
    if (out) actions.push('return');
  }
  actions.push('view');
  if (pending || (isMaterialTeam && out)) actions.push('edit');
  if (out) actions.push('incident');
  if (isMaterialTeam) actions.push('qr');
  return actions;
};
