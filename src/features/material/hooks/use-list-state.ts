'use client';

import { pageWindow, type PageSize, type PageWindow } from '@/features/material/utils/list-view';
import { useState } from 'react';

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
