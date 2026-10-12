'use client';

import { ACCESS_OVERVIEW_USER_PARAMETER } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import type { ReactSelectOption } from '@payloadcms/ui';
import { ReactSelect, toast } from '@payloadcms/ui';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { stringify } from 'qs-esm';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';

const SEARCH_DELAY_MS = 250;
const MAX_RESULTS = 20;

interface UserOption extends ReactSelectOption<string> {
  label: string;
}

interface FoundUser {
  id: string;
  displayName?: string | null;
}

/**
 * Looks people up by name, nickname or email as the admin types. The users collection holds
 * every participant who ever logged in, so the options cannot be sent along with the page.
 */
const useUserSearch = (
  apiRoute: string,
  searchFailed: string,
): { options: UserOption[]; isLoading: boolean; search: (term: string) => void } => {
  const [options, setOptions] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestTerm = useRef('');

  const search = useCallback(
    (term: string): void => {
      const trimmed = term.trim();
      latestTerm.current = trimmed;
      if (pending.current !== undefined) clearTimeout(pending.current);
      if (trimmed === '') {
        setOptions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      pending.current = setTimeout(() => {
        const query = stringify({
          depth: 0,
          limit: MAX_RESULTS,
          select: { displayName: true },
          sort: 'fullName',
          where: {
            or: ['fullName', 'nickname', 'email'].map((field) => ({ [field]: { like: trimmed } })),
          },
        });
        fetch(`${apiRoute}/users?${query}`, { credentials: 'include' })
          .then((response) => (response.ok ? response.json() : { docs: [] }))
          .then((result: { docs?: FoundUser[] }) => {
            // a slower answer to an earlier term must not replace the newer one
            if (latestTerm.current !== trimmed) return;
            setOptions(
              (result.docs ?? []).map((user) => ({
                value: user.id,
                label: user.displayName ?? user.id,
              })),
            );
            setIsLoading(false);
          })
          .catch(() => {
            if (latestTerm.current !== trimmed) return;
            setIsLoading(false);
            toast.error(searchFailed);
          });
      }, SEARCH_DELAY_MS);
    },
    [apiRoute, searchFailed],
  );

  return { options, isLoading, search };
};

/**
 * Picks a person for an admin view, the access overview by default. The choice lives in the
 * address under `parameter`, so the page with a person selected can be shared and reloaded.
 * Clearing it drops the parameter and leaves the others, which a view with two pickers needs.
 */
export const AccessOverviewUserPicker: React.FC<{
  apiRoute: string;
  selected: { id: string; label: string } | undefined;
  placeholder: string;
  noResults: string;
  searchFailed: string;
  parameter?: string;
  inputId?: string;
}> = ({
  apiRoute,
  selected,
  placeholder,
  noResults,
  searchFailed,
  parameter = ACCESS_OVERVIEW_USER_PARAMETER,
  inputId = 'access-overview-user',
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();
  const { options, isLoading, search } = useUserSearch(apiRoute, searchFailed);

  const handleChange = (option: ReactSelectOption | ReactSelectOption[] | null): void => {
    // eslint-disable-next-line unicorn/no-null
    const picked = Array.isArray(option) ? option[0] : (option ?? undefined);
    const next = new URLSearchParams(searchParameters);
    if (picked === undefined || typeof picked.value !== 'string') next.delete(parameter);
    else next.set(parameter, picked.value);
    router.push(next.size === 0 ? pathname : `${pathname}?${next.toString()}`);
  };

  return (
    <ReactSelect
      inputId={inputId}
      isClearable
      isLoading={isLoading}
      isSearchable
      // the server already matched the term; filtering again would drop matches on the email
      filterOption={() => true}
      noOptionsMessage={() => noResults}
      onChange={handleChange}
      onInputChange={search}
      options={options}
      placeholder={placeholder}
      {...(selected === undefined ? {} : { value: { value: selected.id, label: selected.label } })}
    />
  );
};
