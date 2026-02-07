import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'awaiting_approval';

export const useJobFilters = (): {
  state: {
    page: number;
    status: JobStatus | undefined;
    search: string;
    debouncedSearch: string;
    sort: string;
  };
  actions: {
    setPage: Dispatch<SetStateAction<number>>;
    setStatus: (newStatus?: JobStatus) => void;
    setSearch: Dispatch<SetStateAction<string>>;
    setSort: (field: string) => void;
  };
} => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<JobStatus | undefined>();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('-createdAt');

  // Encapsulate the debounce logic here
  useEffect((): (() => void) => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Auto-reset page on new search
    }, 300);
    return (): void => clearTimeout(handler);
  }, [search]);

  // When status changes, reset page
  const handleStatusChange = (newStatus?: JobStatus): void => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleSortChange = (field: string): void => {
    setSort((previous) => (previous === field ? `-${field}` : field));
  };

  return {
    state: {
      page,
      status,
      search,
      debouncedSearch,
      sort,
    },
    actions: {
      setPage,
      setStatus: handleStatusChange,
      setSearch,
      setSort: handleSortChange,
    },
  };
};
