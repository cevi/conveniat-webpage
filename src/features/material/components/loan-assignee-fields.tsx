'use client';

import { format, labels } from '@/features/material/components/material-labels';
import {
  Field,
  inputClass,
  MaterialButton,
  NativeSelect,
} from '@/features/material/components/material-ui';
import { useDebouncedValue } from '@/features/material/hooks/use-debounced-value';
import { materialQueryOptions, useMaterialLocale } from '@/features/material/hooks/use-material';
import { trpc } from '@/trpc/client';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Building2, User } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

const text = {
  assignTo: { de: 'Verbuchen auf', en: 'Book to', fr: 'Attribuer à' },
  wholeDepartment: { de: 'Abteilung', en: 'Department', fr: 'Groupe' },
  singlePerson: { de: 'Einzelperson', en: 'Single person', fr: 'Personne' },
  chooseDepartment: {
    de: 'Abteilung wählen …',
    en: 'Choose department …',
    fr: 'Choisir le groupe …',
  },
  searchPerson: { de: 'Name suchen …', en: 'Search name …', fr: 'Chercher un nom …' },
  selectedPerson: { de: 'Ausgewählt: {name}', en: 'Selected: {name}', fr: 'Choisi : {name}' },
  bookOnMe: {
    de: 'Auf mich verbuchen ({name})',
    en: 'Book on me ({name})',
    fr: 'À mon nom ({name})',
  },
  noOwnDepartment: {
    de: 'Du bist über die Cevi.DB keiner Abteilung zugeordnet. Das Materialteam kann für dich reservieren.',
    en: 'Cevi.DB does not link you to a department. The material team can book for you.',
    fr: 'La Cevi.DB ne te rattache à aucun groupe. L’équipe matériel peut réserver pour toi.',
  },
} satisfies Record<string, StaticTranslationString>;

export type Assignee = 'DEPARTMENT' | 'PERSON';

export interface PickedPerson {
  uuid: string;
  name: string;
}

const SEARCH_DEBOUNCE_MS = 250;

/** Whether a loan is booked on a whole department or on one person in it. */
export const AssigneeToggle: React.FC<{
  value: Assignee;
  onChange: (value: Assignee) => void;
}> = ({ value, onChange }) => {
  const locale = useMaterialLocale();
  return (
    <Field as="group" label={text.assignTo[locale]}>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1" role="radiogroup">
        {(
          [
            ['DEPARTMENT', Building2, text.wholeDepartment[locale]],
            ['PERSON', User, text.singlePerson[locale]],
          ] as const
        ).map(([option, Icon, label]) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            onClick={() => onChange(option)}
            className={cn(
              'flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-semibold',
              value === option ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>
    </Field>
  );
};

/**
 * The department the loan is booked on. The material team picks any; a participant only the
 * departments Cevi.DB links them to, which is what the server accepts.
 */
export const DepartmentSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const locale = useMaterialLocale();
  const departments = trpc.material.getDepartmentList.useQuery(undefined, materialQueryOptions);
  const me = trpc.material.getMe.useQuery(undefined, materialQueryOptions);
  const isMaterialTeam = me.data?.isMaterialTeam ?? false;
  const choices = (departments.data ?? []).filter(
    (department) => isMaterialTeam || department.isMine,
  );
  return (
    <Field
      label={labels.department[locale]}
      {...(departments.data !== undefined && me.data !== undefined && choices.length === 0
        ? { error: text.noOwnDepartment[locale] }
        : {})}
    >
      <NativeSelect value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{text.chooseDepartment[locale]}</option>
        {choices.map((department) => (
          <option key={department.id} value={department.id}>
            {department.shortName} · {department.name}
          </option>
        ))}
      </NativeSelect>
    </Field>
  );
};

/**
 * The person a loan is booked on. The material team finds anyone by name, asking the server
 * once typing pauses; a participant books on themselves only.
 */
export const PersonPicker: React.FC<{
  value: PickedPerson | undefined;
  /** called without a value when the pick is undone */
  onChange: (value?: PickedPerson) => void;
}> = ({ value, onChange }) => {
  const locale = useMaterialLocale();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const me = trpc.material.getMe.useQuery(undefined, materialQueryOptions);
  const isMaterialTeam = me.data?.isMaterialTeam ?? false;
  const people = trpc.material.searchPersonList.useQuery(
    { query: debouncedQuery },
    { ...materialQueryOptions, enabled: isMaterialTeam && value === undefined },
  );

  if (value === undefined && !isMaterialTeam) {
    return (
      <Field as="group" label={labels.person[locale]}>
        <MaterialButton
          variant="secondary"
          className="w-full"
          disabled={me.data === undefined}
          onClick={() => {
            if (me.data !== undefined) onChange({ uuid: me.data.uuid, name: me.data.name });
          }}
        >
          {format(text.bookOnMe, locale, { name: me.data?.name ?? '…' })}
        </MaterialButton>
      </Field>
    );
  }

  return (
    <Field as="group" label={labels.person[locale]}>
      {value === undefined ? (
        <>
          <input
            className={inputClass}
            aria-label={text.searchPerson[locale]}
            placeholder={text.searchPerson[locale]}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <ul className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200">
            {people.data?.map((candidate) => (
              <li key={candidate.uuid}>
                <button
                  type="button"
                  className="w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => onChange(candidate)}
                >
                  {candidate.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
          {format(text.selectedPerson, locale, { name: value.name })}
          <MaterialButton variant="ghost" onClick={() => onChange()}>
            {labels.cancel[locale]}
          </MaterialButton>
        </div>
      )}
    </Field>
  );
};
