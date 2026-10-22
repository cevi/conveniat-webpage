import { AppSearchBar } from '@/components/ui/app-search-bar';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { Contact } from '@/features/chat/api/queries/list-contacts';
import {
  ChosenPeople,
  ContactRowContent,
  contactRowItemClassName,
  ContactRowsSkeleton,
  SelectionMark,
} from '@/features/chat/components/chat-overview-view/contact-row';
import { newChatText } from '@/features/chat/components/chat-overview-view/create-chat-skeleton';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Loader2, UserPlus, Users } from 'lucide-react';
import type React from 'react';
import { useId } from 'react';

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

const noContactsToAddText: StaticTranslationString = {
  de: 'Alle deine Kontakte sind schon dabei',
  en: 'All your contacts are already in',
  fr: 'Tous tes contacts en font déjà partie',
};

const noContactsFoundText: StaticTranslationString = {
  de: 'Keine Kontakte für deine Suche gefunden',
  en: 'No contacts found matching your search',
  fr: 'Aucun contact trouvé pour ta recherche',
};

const loadingContactsText: StaticTranslationString = {
  de: 'Lade Kontakte …',
  en: 'Loading contacts …',
  fr: 'Chargement des contacts …',
};

const addingText: StaticTranslationString = {
  de: 'Hinzufügen …',
  en: 'Adding …',
  fr: 'Ajout …',
};

const chooseHintText: StaticTranslationString = {
  de: 'Wähle aus, wen du hinzufügen möchtest.',
  en: 'Choose whom to add.',
  fr: 'Choisis qui ajouter.',
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
  const hintId = useId();
  let hint: string | undefined = selectedContacts.length === 0 ? chooseHintText[locale] : undefined;
  if (isAtGroupLimit && maxGroupMembers !== undefined) {
    hint = groupLimitReachedText[locale].replace('{max}', String(maxGroupMembers));
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={addParticipantsText[locale]}
      footer={
        <div className="flex flex-col gap-2">
          {/* in the footer, like Neue Gruppe: a strip over the list would move it under the finger */}
          <ChosenPeople
            people={selectedContacts}
            onRemove={onToggleSelection}
            hint={hint === undefined ? undefined : { id: hintId, text: hint }}
            locale={locale}
            className="-mx-5 px-5"
          />
          {addError !== undefined && (
            <p className="text-danger-text text-sm font-semibold" role="alert">
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
            {isAdding ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <UserPlus aria-hidden="true" />
            )}
            {isAdding ? addingText[locale] : addCountText(selectedContacts.length, locale)}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-1 pt-1">
        {/* on the white sheet, so the filled field */}
        <AppSearchBar
          placeholder={newChatText.search[locale]}
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          onClear={() => onSearchChange('')}
        />

        {isLoadingContacts && (
          // the skeleton's rows have 16px of their own, the sheet's rows 20px
          <div role="status" className="-mx-4">
            <span className="sr-only">{loadingContactsText[locale]}</span>
            <ContactRowsSkeleton count={4} withMark />
          </div>
        )}
        {!isLoadingContacts && addableContacts.length === 0 && (
          <EmptyState
            icon={Users}
            title={searchQuery === '' ? noContactsToAddText[locale] : noContactsFoundText[locale]}
            className="py-8"
          />
        )}
        {!isLoadingContacts && addableContacts.length > 0 && (
          // rows on the white sheet, divided by a line from the text on, as in Neue Gruppe
          <ul className="-mx-5">
            {addableContacts.map((contact) => {
              const isSelected = selectedContacts.some((c) => c.userId === contact.userId);
              return (
                <li
                  key={contact.userId}
                  className={cn(contactRowItemClassName, 'after:left-[76px]')}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={() => onToggleSelection(contact)}
                    disabled={!isSelected && isAtGroupLimit}
                    className={cn(
                      'focus-visible:focus-ring-inset flex min-h-16 w-full cursor-pointer items-center gap-3 px-5 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-50',
                      isSelected ? 'bg-tint' : 'hover:bg-quiet',
                    )}
                  >
                    <ContactRowContent contact={contact} />
                    <SelectionMark isSelected={isSelected} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </BottomSheet>
  );
};
