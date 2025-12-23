import { Button } from '@/components/ui/buttons/button';
import { Input } from '@/components/ui/input';
import type { Contact } from '@/features/chat/api/queries/list-contacts';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Check, Loader2, Search, UserPlus, X } from 'lucide-react';
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
  locale: Locale;
}

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

const addSelectedText: StaticTranslationString = {
  de: 'Ausgewählte hinzufügen',
  en: 'Add Selected',
  fr: 'Ajouter la sélection',
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
  locale,
}) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="font-heading mb-4 text-lg font-semibold text-gray-900">Add Participants</h3>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder={searchContactsPlaceholder[locale]}
          className="font-body focus:border-conveniat-green focus:ring-conveniat-green border-gray-300 pl-10"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      {/* Selected Contacts Chips */}
      {selectedContacts.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="font-body text-sm font-medium text-gray-700">
            Selected: {selectedContacts.length}
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedContacts.map((contact) => (
              <div
                key={contact.userId}
                className="font-body text-conveniat-green flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm"
              >
                <span>{contact.name}</span>
                <button
                  onClick={() => onToggleSelection(contact)}
                  className="rounded-full p-0.5 hover:bg-green-200"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contacts List */}
      <div className="mb-4 h-[200px] space-y-1 overflow-y-auto rounded-md border p-2">
        {isLoadingContacts && (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {loadingContactsText[locale]}
          </div>
        )}
        {!isLoadingContacts &&
          (addableContacts.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              {searchQuery === '' ? noContactsToAddText[locale] : noContactsFoundText[locale]}
            </div>
          ) : (
            addableContacts.map((contact) => {
              const isSelected = selectedContacts.some((c) => c.userId === contact.userId);
              return (
                <div
                  key={contact.userId}
                  className={`flex cursor-pointer items-center justify-between space-x-3 rounded-lg p-3 transition-colors ${isSelected ? 'text-conveniat-green bg-green-100' : 'hover:bg-gray-100'
                    }`}
                  onClick={() => onToggleSelection(contact)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${isSelected ? 'bg-conveniat-green text-white' : 'bg-gray-200 text-gray-600'
                        }`}
                    >
                      <span className="font-heading text-sm font-semibold">
                        {contact.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-body text-sm font-medium">{contact.name}</span>
                  </div>
                  {isSelected && (
                    <div className="bg-conveniat-green flex h-5 w-5 items-center justify-center rounded-full">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
              );
            })
          ))}
      </div>

      {/* Add Button */}
      <Button
        onClick={onAddParticipants}
        disabled={selectedContacts.length === 0 || isAdding}
        className="bg-conveniat-green font-body w-full hover:bg-green-600 disabled:bg-gray-300"
      >
        <UserPlus className="mr-2 h-4 w-4" />
        {isAdding
          ? addingText[locale]
          : `${addSelectedText[locale]} (${selectedContacts.length})`}
      </Button>
    </div>
  );
};
