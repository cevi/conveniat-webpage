'use client';

import type { CeviGroupSuggestion } from '@/features/payload-cms/payload-cms/chat-channels/channel-endpoints';
import { useCeviGroupSuggestions } from '@/features/payload-cms/payload-cms/components/chat-channel/use-cevi-group-suggestions';
import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import type { StaticTranslationString } from '@/types/types';
import type { ReactSelectOption } from '@payloadcms/ui';
import { FieldError, FieldLabel, ReactSelect, useField, useTranslation } from '@payloadcms/ui';
import type { NumberFieldClientComponent } from 'payload';
import { useMemo, useState } from 'react';

/** Enough to scroll through; typing narrows the rest down. */
const MAX_OPTIONS = 50;

const placeholder: StaticTranslationString = {
  de: 'Gruppenname oder ID eingeben',
  en: 'Type a group name or ID',
  fr: 'Saisis le nom ou l’ID du groupe',
};
const noMatch: StaticTranslationString = {
  de: 'Keine bekannte Gruppe. Eine Gruppe ausserhalb der Liste wird über ihre ID ausgewählt.',
  en: 'No known group. A group outside the list is picked by its ID.',
  fr: 'Aucun groupe connu. Un groupe hors de la liste se choisit par son ID.',
};
const peopleLabel = (count: number): StaticTranslationString => ({
  de: `${String(count)} ${count === 1 ? 'Person' : 'Personen'} angemeldet`,
  en: `${String(count)} ${count === 1 ? 'person' : 'people'} logged in`,
  fr: `${String(count)} ${count === 1 ? 'personne connectée' : 'personnes connectées'}`,
});
const unknownIdLabel = (id: number): StaticTranslationString => ({
  de: `ID ${String(id)} verwenden (bisher hat sich niemand aus dieser Gruppe angemeldet)`,
  en: `Use ID ${String(id)} (nobody from this group has logged in yet)`,
  fr: `Utiliser l’ID ${String(id)} (personne de ce groupe ne s’est encore connecté)`,
});

const toId = (text: string): number | undefined => {
  const trimmed = text.trim();
  if (!/^\d{1,9}$/.test(trimmed)) return undefined;
  const id = Number(trimmed);
  return id > 0 ? id : undefined;
};

const matches = (group: CeviGroupSuggestion, search: string): boolean => {
  const term = search.trim().toLowerCase();
  return term === '' || group.name.toLowerCase().includes(term) || String(group.id).includes(term);
};

/**
 * Picks the Cevi.DB group of a channel's audience by its name. The list holds every group a
 * logged-in user is in, plus the groups of the functions and the Höfe; any other group is
 * taken by its ID. Picking a known group fills in its name beside it.
 */
export const CeviGroupPicker: NumberFieldClientComponent = ({ field, path, readOnly }) => {
  const { i18n } = useTranslation();
  const locale = getAdminLocale(i18n);
  const { value, setValue, showError } = useField<number | null>({ path });
  const groupName = useField<string | null>({ path: path.replace(/groupId$/, 'groupName') });
  const { groups, isLoading } = useCeviGroupSuggestions();
  const [search, setSearch] = useState('');

  const options = useMemo((): ReactSelectOption<number>[] => {
    const found = groups
      .filter((group) => matches(group, search))
      .slice(0, MAX_OPTIONS)
      .map((group) => ({
        value: group.id,
        label: `${group.name === '' ? '–' : group.name} (${String(group.id)}) · ${peopleLabel(group.members)[locale]}`,
      }));
    const typedId = toId(search);
    if (typedId !== undefined && !groups.some((group) => group.id === typedId)) {
      found.unshift({ value: typedId, label: unknownIdLabel(typedId)[locale] });
    }
    return found;
  }, [groups, search, locale]);

  const selected = useMemo((): ReactSelectOption<number> | undefined => {
    if (typeof value !== 'number') return undefined;
    const known = groups.find((group) => group.id === value);
    const name = known?.name ?? groupName.value ?? '';
    return { value, label: name === '' ? String(value) : `${name} (${String(value)})` };
  }, [value, groups, groupName.value]);

  const handleChange = (option: ReactSelectOption | ReactSelectOption[] | null): void => {
    const picked = Array.isArray(option) ? option[0] : (option ?? undefined);
    const id = typeof picked?.value === 'number' ? picked.value : undefined;
    // picking the same group again keeps a name the editor may have changed
    if (id === value) return;
    setValue(id);
    // a group outside the list starts without a name; the editor can give it one below
    const known = groups.find((group) => group.id === id);
    groupName.setValue(known?.name ?? '');
  };

  return (
    <div className="field-type mb-4">
      <FieldLabel
        path={path}
        required={field.required === true}
        {...(field.label === undefined ? {} : { label: field.label })}
      />
      <FieldError path={path} showError={showError} />
      <ReactSelect
        inputId={`field-${path.replaceAll('.', '__')}`}
        disabled={readOnly === true}
        isClearable
        isLoading={isLoading}
        isSearchable
        // the options are already narrowed down to the search, by name and by ID
        filterOption={() => true}
        noOptionsMessage={() => noMatch[locale]}
        onChange={handleChange}
        onInputChange={setSearch}
        options={options}
        placeholder={placeholder[locale]}
        showError={showError}
        {...(selected === undefined ? {} : { value: selected })}
      />
    </div>
  );
};
