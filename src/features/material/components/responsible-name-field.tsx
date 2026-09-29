'use client';

import { HolderAvatar } from '@/features/material/components/counter-ui';
import { Field, focusRing, inputClass } from '@/features/material/components/material-ui';
import { useDebouncedValue } from '@/features/material/hooks/use-debounced-value';
import { materialQueryOptions } from '@/features/material/hooks/use-material';
import {
  formatHofRoles,
  type HofRole,
} from '@/features/payload-cms/payload-cms/utils/hof-directory';
import { trpc } from '@/trpc/client';
import { cn } from '@/utils/tailwindcss-override';
import { keepPreviousData } from '@tanstack/react-query';
import type React from 'react';
import { useState } from 'react';

const SUGGESTIONS = 5;
const SEARCH_DEBOUNCE_MS = 250;

/** A suggested person; the details are missing in a search cached before they existed. */
interface Suggestion {
  uuid: string;
  name: string;
  funktionen?: string[] | undefined;
  hofRoles?: HofRole[] | undefined;
}

/** One suggestion, with the functions and the Hof line the address book shows. */
const SuggestionRow: React.FC<{ person: Suggestion; onPick: (name: string) => void }> = ({
  person,
  onPick,
}) => {
  const funktionen = (person.funktionen ?? []).join(', ');
  const hof = formatHofRoles(person.hofRoles ?? []);
  return (
    <li>
      <button
        type="button"
        // keeps the focus in the input, so the list is not closed before the tap lands
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onPick(person.name)}
        className={cn(
          'flex min-h-12 w-full cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-gray-50',
          focusRing,
          'focus-visible:ring-inset',
        )}
      >
        <HolderAvatar name={person.name} className="size-9 text-xs" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-gray-900">{person.name}</span>
          {funktionen !== '' && (
            <span className="text-conveniat-green block truncate text-xs font-medium">
              {funktionen}
            </span>
          )}
          {hof !== '' && <span className="block truncate text-xs text-gray-500">{hof}</span>}
        </span>
      </button>
    </li>
  );
};

/**
 * Who picks a Hof's material up: any name, with the people registered in the app suggested
 * while it is typed. A name nobody registered is kept as typed, and so is a picked one: the
 * loan stores the name, not the person.
 */
export const ResponsibleNameField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const query = value.trim();
  const debounced = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const people = trpc.material.searchPersonList.useQuery(
    { query: debounced },
    // the previous matches stay while the next are asked, so the page below does not jump
    { ...materialQueryOptions, enabled: debounced !== '', placeholderData: keepPreviousData },
  );
  const suggestions: Suggestion[] =
    open && query !== '' ? (people.data ?? []).slice(0, SUGGESTIONS) : [];

  return (
    <div
      className="space-y-2"
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Field label={label}>
        <input
          className={inputClass}
          value={value}
          autoComplete="off"
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false);
          }}
        />
      </Field>
      {suggestions.length > 0 && (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {suggestions.map((person) => (
            <SuggestionRow
              key={person.uuid}
              person={person}
              onPick={(name) => {
                onChange(name);
                setOpen(false);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
};
