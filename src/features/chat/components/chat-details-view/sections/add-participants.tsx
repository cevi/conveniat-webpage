import { AppSearchBar } from '@/components/ui/app-search-bar';
import { Button } from '@/components/ui/buttons/button';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { SectionLabel } from '@/components/ui/section-label';
import type { Contact } from '@/features/chat/api/queries/list-contacts';
import {
  describeContactFunktionen,
  describeContactHof,
} from '@/features/chat/utils/contact-search';
import type { Locale, StaticTranslationString } from '@/types/types';
import { getContactDisplayName, getContactShortName } from '@/utils/format-user-name';
import { cn } from '@/utils/tailwindcss-override';
import { Check, Loader2, UserPlus, X } from 'lucide-react';
import type React from 'react';

interface AddParticipantsProperties {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedContacts: Contact[];
  addableContacts: Contact[];
  onToggleSelection: (contact: Contact) => void;
  onAddParticipants: () => void;
  isLoadingContacts: boolean;
  isAdding: boolean;
  /** Why the last add failed, shown above the button. */
  addError: string | undefined;
  /** Whether the selection already fills the group up to `maxGroupMembers`. */
  isAtGroupLimit: boolean;
  maxGroupMembers: number | undefined;
  locale: Locale;
}

const addParticipantsText: StaticTranslationString = {
  de: 'Teilnehmende hinzufügen',
  en: 'Add Participants',
  fr: 'Ajouter des participants',
};

const searchContactsPlaceholder: StaticTranslationString = {
  de: 'Kontakte suchen...',
  en: 'Search contacts to add...',
  fr: 'Rechercher des contacts à ajouter...',
};

const noContactsToAddText: StaticTranslationString = {
  de: 'Keine Kontakte hinzuzufügen.',
  en: 'No contacts to add.',
  fr: 'Aucun contact à ajouter.',
};

const noContactsFoundText: StaticTranslationString = {
  de: 'Keine Kontakte gefunden, die deiner Suche entsprechen',
  en: 'No contacts found matching your search',
  fr: 'Aucun contact trouvé correspondant à votre recherche',
};

const loadingContactsText: StaticTranslationString = {
  de: 'Kontakte werden geladen...',
  en: 'Loading contacts...',
  fr: 'Chargement des contacts...',
};

const addingText: StaticTranslationString = {
  de: 'Hinzufügen...',
  en: 'Adding...',
  fr: 'Ajout...',
};

const groupLimitReachedText: StaticTranslationString = {
  de: 'Eine Gruppe hat höchstens {max} Mitglieder.',
  en: 'A group can have at most {max} members.',
  fr: 'Un groupe compte au plus {max} membres.',
};

const addSelectedText: StaticTranslationString = {
  de: 'Ausgewählte hinzufügen',
  en: 'Add Selected',
  fr: 'Ajouter la sélection',
};

const selectedText: StaticTranslationString = {
  de: 'Ausgewählt',
  en: 'Selected',
  fr: 'Sélectionné',
};

const removeText: StaticTranslationString = {
  de: '{name} entfernen',
  en: 'Remove {name}',
  fr: 'Retirer {name}',
};

export const AddParticipants: React.FC<AddParticipantsProperties> = ({
  searchQuery,
  onSearchChange,
  selectedContacts,
  addableContacts,
  onToggleSelection,
  onAddParticipants,
  isLoadingContacts,
  isAdding,
  addError,
  isAtGroupLimit,
  maxGroupMembers,
  locale,
}) => {
  return (
    <section className="flex flex-col gap-3">
      <SectionLabel>{addParticipantsText[locale]}</SectionLabel>

      {/* on the grey page of the details, so the white field with a line */}
      <AppSearchBar
        onPage
        placeholder={searchContactsPlaceholder[locale]}
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        onClear={() => onSearchChange('')}
      />

      {selectedContacts.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel as="h3">
            {selectedText[locale]} ({selectedContacts.length})
          </SectionLabel>
          <ul className="flex flex-wrap gap-2">
            {selectedContacts.map((contact) => (
              <li key={contact.userId}>
                <button
                  type="button"
                  onClick={() => onToggleSelection(contact)}
                  aria-label={removeText[locale].replace('{name}', getContactDisplayName(contact))}
                  className="border-rail flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border bg-white pr-3 pl-4 text-sm font-semibold text-green-900"
                >
                  {getContactShortName(contact)}
                  <X className="h-4 w-4 text-green-700" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isAtGroupLimit && maxGroupMembers !== undefined && (
        <p className="text-[13px] text-green-700">
          {groupLimitReachedText[locale].replace('{max}', String(maxGroupMembers))}
        </p>
      )}

      {isLoadingContacts && (
        <div
          className="flex items-center justify-center gap-2 py-6 text-[15px] text-green-700"
          role="status"
        >
          <Loader2 className="h-5 w-5 animate-spin text-green-500" aria-hidden="true" />
          {loadingContactsText[locale]}
        </div>
      )}
      {!isLoadingContacts && addableContacts.length === 0 && (
        <p className="border-line rounded-[14px] border bg-white px-4 py-6 text-center text-[15px] text-green-700">
          {searchQuery === '' ? noContactsToAddText[locale] : noContactsFoundText[locale]}
        </p>
      )}
      {!isLoadingContacts && addableContacts.length > 0 && (
        <ul className="border-line divide-line divide-y overflow-hidden rounded-[14px] border bg-white">
          {addableContacts.map((contact) => {
            const isSelected = selectedContacts.some((c) => c.userId === contact.userId);
            return (
              <li key={contact.userId}>
                <button
                  type="button"
                  onClick={() => onToggleSelection(contact)}
                  disabled={!isSelected && isAtGroupLimit}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex min-h-[64px] w-full cursor-pointer items-center gap-3 px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-50',
                    isSelected ? 'bg-tint' : 'hover:bg-page',
                  )}
                >
                  <PersonAvatar
                    seed={contact.userId}
                    name={contact.name}
                    pictureUrl={contact.pictureUrl}
                    className="h-11 w-11 text-sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] leading-5 font-semibold text-green-900">
                      {getContactDisplayName(contact)}
                    </span>
                    {contact.description && (
                      <span className="mt-0.5 block text-[13px] text-green-700">
                        {contact.description}
                      </span>
                    )}
                    {describeContactFunktionen(contact) !== '' && (
                      <span className="text-conveniat-green mt-0.5 block text-[13px] font-semibold">
                        {describeContactFunktionen(contact)}
                      </span>
                    )}
                    {describeContactHof(contact) !== '' && (
                      <span className="mt-0.5 block text-[13px] text-green-700">
                        {describeContactHof(contact)}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                      isSelected ? 'bg-conveniat-green text-white' : 'border-rail border-2',
                    )}
                    aria-hidden="true"
                  >
                    {isSelected && <Check className="h-4 w-4" strokeWidth={3} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {addError !== undefined && (
        <p className="text-sm font-semibold text-green-900" role="alert">
          {addError}
        </p>
      )}

      <Button
        variant="primary"
        size="touch"
        className="w-full"
        onClick={onAddParticipants}
        disabled={selectedContacts.length === 0 || isAdding}
      >
        <UserPlus aria-hidden="true" />
        {isAdding ? addingText[locale] : `${addSelectedText[locale]} (${selectedContacts.length})`}
      </Button>
    </section>
  );
};
