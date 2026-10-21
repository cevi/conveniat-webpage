import { AppSearchBar } from '@/components/ui/app-search-bar';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/buttons/button';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { SectionLabel } from '@/components/ui/section-label';
import type { Contact } from '@/features/chat/api/queries/list-contacts';
import {
  describeContactFunktionen,
  describeContactHof,
} from '@/features/chat/utils/contact-search';
import { splitDisplayName } from '@/features/chat/utils/split-display-name';
import type { Locale, StaticTranslationString } from '@/types/types';
import { getContactDisplayName, getContactShortName } from '@/utils/format-user-name';
import { cn } from '@/utils/tailwindcss-override';
import { Check, Loader2, UserPlus, X } from 'lucide-react';
import type React from 'react';

interface AddParticipantsProperties {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  en: 'Add participants',
  fr: 'Ajouter des participant·es',
};

const searchContactsPlaceholder: StaticTranslationString = {
  de: 'Name, Ceviname oder Hof',
  en: 'Name, Cevi name or Hof',
  fr: 'Nom, nom Cevi ou Hof',
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

const addCountText = (count: number, locale: Locale): string => {
  if (count === 0) {
    if (locale === 'de') return 'Hinzufügen';
    if (locale === 'fr') return 'Ajouter';
    return 'Add';
  }
  if (locale === 'de') return `${count} hinzufügen`;
  if (locale === 'fr') return `Ajouter ${count}`;
  return `Add ${count}`;
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

/**
 * The sheet to add people to a group: a search over the contacts, the people picked so far,
 * and one button that adds them all.
 */
export const AddParticipants: React.FC<AddParticipantsProperties> = ({
  open,
  onOpenChange,
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
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={addParticipantsText[locale]}
      footer={
        <Button
          variant="primary"
          size="touch"
          className="w-full"
          onClick={onAddParticipants}
          disabled={selectedContacts.length === 0 || isAdding}
        >
          {isAdding ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <UserPlus aria-hidden="true" />
          )}
          {isAdding ? addingText[locale] : addCountText(selectedContacts.length, locale)}
        </Button>
      }
    >
      <div className="flex flex-col gap-3 pt-1">
        {/* on the white sheet, so the filled field */}
        <AppSearchBar
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
                    aria-label={removeText[locale].replace(
                      '{name}',
                      getContactDisplayName(contact),
                    )}
                    className="border-rail flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border bg-white pr-3 pl-4 text-sm font-semibold text-green-900"
                  >
                    {splitDisplayName(getContactShortName(contact)).primary}
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
          <p className="py-6 text-center text-[15px] text-green-700">
            {searchQuery === '' ? noContactsToAddText[locale] : noContactsFoundText[locale]}
          </p>
        )}
        {!isLoadingContacts && addableContacts.length > 0 && (
          // rows on the white sheet, divided by lines, without a card of their own
          <ul className="divide-line -mx-5 divide-y">
            {addableContacts.map((contact) => {
              const isSelected = selectedContacts.some((c) => c.userId === contact.userId);
              const { primary, secondary } = splitDisplayName(getContactDisplayName(contact));
              const subtitle = [
                contact.description ?? '',
                describeContactFunktionen(contact),
                describeContactHof(contact),
              ]
                .filter((line) => line !== '')
                .join(' · ');
              return (
                <li key={contact.userId}>
                  <button
                    type="button"
                    onClick={() => onToggleSelection(contact)}
                    disabled={!isSelected && isAtGroupLimit}
                    aria-pressed={isSelected}
                    className={cn(
                      'flex min-h-[64px] w-full cursor-pointer items-center gap-3 px-5 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-50',
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
                      <span className="block truncate text-[15px] leading-5 text-green-900">
                        <span className="font-semibold">{primary}</span>
                        {secondary !== undefined && (
                          <span className="text-green-700"> {secondary}</span>
                        )}
                      </span>
                      {subtitle !== '' && (
                        <span className="mt-0.5 block truncate text-[13px] text-green-700">
                          {subtitle}
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
      </div>
    </BottomSheet>
  );
};
