'use client';

import {
  pageWindow,
  rangeBetween,
  type PageSize,
  type PageWindow,
} from '@/features/material/utils/list-view';
import { useCallback, useRef, useState } from 'react';

interface PageState {
  key: string;
  page: number;
  loaded: number;
  pageSize: PageSize;
}

export interface Pagination {
  slice: PageWindow;
  total: number;
  pageSize: PageSize;
  setPage: (page: number) => void;
  setPageSize: (pageSize: PageSize) => void;
  loadMore: () => void;
  loadPrevious: () => void;
}

/**
 * Client-side paging of a list that is already loaded. `resetKey` stands for the filters and
 * the sort: when it changes, the list starts again at its first page. That is derived during
 * render rather than reset in an effect, so the stale page never shows for a frame.
 */
export const usePagination = (
  total: number,
  resetKey: string,
  initialPageSize: PageSize = 25,
): Pagination => {
  const [state, setState] = useState<PageState>({
    key: resetKey,
    page: 1,
    loaded: 1,
    pageSize: initialPageSize,
  });
  const current: PageState =
    state.key === resetKey ? state : { ...state, key: resetKey, page: 1, loaded: 1 };
  const slice = pageWindow({
    total,
    page: current.page,
    pageSize: current.pageSize,
    loaded: current.loaded,
  });

  return {
    slice,
    total,
    pageSize: current.pageSize,
    setPage: (page) => setState({ ...current, page, loaded: 1 }),
    setPageSize: (pageSize) => setState({ ...current, pageSize, page: 1, loaded: 1 }),
    loadMore: () => setState({ ...current, page: slice.page, loaded: current.loaded + 1 }),
    loadPrevious: () =>
      setState({ ...current, page: Math.max(1, slice.page - 1), loaded: current.loaded + 1 }),
  };
};

export interface Selection {
  ids: ReadonlySet<string>;
  /** a row's checkbox; with shift held it takes the range since the last one clicked */
  toggle: (id: string, options?: { shift?: boolean; pageIds?: readonly string[] }) => void;
  setMany: (ids: readonly string[], selected: boolean) => void;
  clear: () => void;
}

/**
 * Selected rows by id, held in state rather than in the checkboxes, so the selection outlives
 * a page change and a refetch that re-renders every row.
 */
export const useSelection = (): Selection => {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());
  const lastClicked = useRef<string | undefined>(undefined);

  const setMany = useCallback((changed: readonly string[], selected: boolean): void => {
    setIds((previous) => {
      const next = new Set(previous);
      for (const id of changed) {
        if (selected) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const toggle = useCallback<Selection['toggle']>((id, options) => {
    const anchor = lastClicked.current;
    lastClicked.current = id;
    setIds((previous) => {
      const selected = !previous.has(id);
      const range =
        options?.shift === true && anchor !== undefined && options.pageIds !== undefined
          ? rangeBetween(options.pageIds, anchor, id)
          : [id];
      const next = new Set(previous);
      for (const rowId of range) {
        if (selected) next.add(rowId);
        else next.delete(rowId);
      }
      return next;
    });
  }, []);

  const clear = useCallback((): void => {
    lastClicked.current = undefined;
    setIds(new Set());
  }, []);

  return { ids, toggle, setMany, clear };
};
