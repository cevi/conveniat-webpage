'use client';
import { Button } from '@/components/ui/buttons/button';
import { Input } from '@/components/ui/input';
import type { Contact } from '@/features/chat/api/queries/list-contacts';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { ArrowLeft, MessageSquarePlus, Search, Users, X } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';

const groupNamePlaceholder: StaticTranslationString = {
  de: 'Gruppennamen eingeben (erforderlich)',
  en: 'Enter group name (required)',
  fr: 'Entrez le nom du groupe (obligatoire)',
};

const searchContactsPlaceholder: StaticTranslationString = {
  de: 'Kontakte suchen...',
  en: 'Search contacts...',
  fr: 'Rechercher des contacts...',
};

const creatingText: StaticTranslationString = {
  en: 'Creating...',
  de: 'Erstelle...',
  fr: 'Création en cours...',
};

const createText: StaticTranslationString = {
  en: 'Create',
  de: 'Erstellen',
  fr: 'Créer',
};

const newChat: StaticTranslationString = {
  en: 'New Chat',
  de: 'Neuer Chat',
  fr: 'Nouveau chat',
};

const selectContactsText: StaticTranslationString = {
  en: 'Select Contacts',
  de: 'Kontakte auswählen',
  fr: 'Sélectionner des contacts',
};

const loadingContactsText: StaticTranslationString = {
  en: 'Loading contacts...',
  de: 'Lade Kontakte...',
  fr: 'Chargement des contacts...',
};

const groupMinMaxLength: StaticTranslationString = {
  en: 'Group name must be between 2-50 characters',
  de: 'Gruppenname muss zwischen 2 und 50 Zeichen liegen',
  fr: 'Le nom du groupe doit comporter entre 2 et 50 caractères',
};

export const CreateNewChatPage: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { data: allContacts, isLoading } = trpc.chat.contacts.useQuery({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [groupChatName, setGroupChatName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const [groupChatNameError, setGroupChatNameError] = useState('');

  const trpcUtils = trpc.useUtils();

  const { mutate } = trpc.chat.createChat.useMutation({
    onSuccess: async () => {
      await trpcUtils.chat.chats.invalidate();
    },
  });

  const isGroupChat = selectedContacts.length > 1;

  const filteredContacts = allContacts?.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const validateGroupName = (name: string): string => {
    if (isGroupChat && name.trim().length === 0) {
      return 'Group name is required for group chats';
    }
    if (name.trim().length > 0 && name.trim().length < 2) {
      return 'Group name must be at least 2 characters';
    }
    if (name.trim().length > 50) {
      return 'Group name must be less than 50 characters';
    }
    return '';
  };

  const isFormValid =
    selectedContacts.length > 0 &&
    (!isGroupChat || (groupChatName.trim().length >= 2 && groupChatName.trim().length <= 50));

  const handleContactToggle = (contact: Contact): void => {
    setSelectedContacts((previous) => {
      const isSelected = previous.some((c) => c.userId === contact.userId);
      return isSelected
        ? previous.filter((c) => c.userId !== contact.userId)
        : [...previous, contact];
    });
  };

  const handleCreateChat = (): void => {
    if (selectedContacts.length === 0 || isCreating) {
      return;
    }

    const nameError = validateGroupName(groupChatName);
    if (nameError !== '') {
      setGroupChatNameError(nameError);
      return;
    }

    try {
      setIsCreating(true);
      const chatName: string | undefined =
        selectedContacts.length > 1 && groupChatName.trim() !== ''
          ? groupChatName.trim()
          : undefined;

      mutate({ chatName, members: selectedContacts });

      // Navigate back to chat list
      router.push('/app/chat');
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleGroupNameChange = (value: string): void => {
    setGroupChatName(value);
    // Clear error when user starts typing
    if (groupChatNameError !== '') {
      setGroupChatNameError('');
    }
    // Validate on change for real-time feedback
    const error = validateGroupName(value);
    setGroupChatNameError(error);
  };

  return (
    <div className="fixed top-0 z-[100] flex h-dvh w-screen flex-col overflow-y-hidden bg-gray-50 xl:top-[62px] xl:left-[480px] xl:z-0 xl:h-[calc(100dvh-62px)] xl:w-[calc(100dvw-480px)]">
      {/* Header */}
      <div className="flex h-16 items-center gap-3 border-b-2 border-gray-200 bg-white px-4">
        <Link href="/app/chat">
          <Button variant="ghost" size="icon" className="mr-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="h-5 w-5 text-gray-700" />
          <h1 className="font-heading text-lg font-semibold text-gray-900">{newChat[locale]}</h1>
        </div>
        <div className="ml-auto">
          <Button
            onClick={handleCreateChat}
            disabled={!isFormValid || isCreating}
            className="bg-conveniat-green font-body text-green-100 hover:bg-green-700 disabled:bg-gray-300"
          >
            {isCreating
              ? creatingText[locale]
              : `${createText[locale]} (${selectedContacts.length})`}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Group Chat Name Input */}
          {isGroupChat && (
            <div className="space-y-2">
              <label className="font-body text-sm font-medium text-gray-700">
                Group Chat Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder={groupNamePlaceholder[locale]}
                value={groupChatName}
                onChange={(changeEvent) => handleGroupNameChange(changeEvent.target.value)}
                className={`font-body focus:ring-conveniat-green ${
                  groupChatNameError === ''
                    ? 'focus:border-conveniat-green border-gray-300'
                    : 'border-red-300 focus:border-red-500'
                }`}
                required
              />
              {groupChatNameError !== '' && (
                <p className="font-body text-sm text-red-600">{groupChatNameError}</p>
              )}
              <p className="font-body text-xs text-gray-500">{groupMinMaxLength[locale]}</p>
            </div>
          )}

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={searchContactsPlaceholder[locale]}
              className="font-body focus:border-conveniat-green focus:ring-conveniat-green border-gray-300 pl-10"
              value={searchQuery}
              onChange={(changeEvent) => setSearchQuery(changeEvent.target.value)}
            />
          </div>

          {/* Selected Contacts */}
          {selectedContacts.length > 0 && (
            <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-conveniat-green" />
                <span className="font-body text-sm font-medium text-gray-700">
                  Selected: {selectedContacts.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedContacts.map((contact) => (
                  <div
                    key={contact.userId}
                    className="font-body text-conveniat-green flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm"
                  >
                    <span>{contact.name}</span>
                    <button
                      onClick={() => handleContactToggle(contact)}
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
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b-2 border-gray-200 p-4">
              <h2 className="font-body text-sm font-medium text-gray-700">
                {selectContactsText[locale]}
              </h2>
            </div>

            <div className="min-h-[400px]">
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="border-t-conveniat-green h-6 w-6 animate-spin rounded-full border-2 border-gray-300"></div>
                    <p className="font-body text-sm text-gray-600">{loadingContactsText[locale]}</p>
                  </div>
                </div>
              )}

              {!isLoading && filteredContacts?.length === 0 && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="font-body mt-2 text-sm text-balance text-gray-500">
                      {searchQuery === ''
                        ? 'No contacts available'
                        : 'No contacts found matching your search'}
                    </p>
                  </div>
                </div>
              )}

              {!isLoading && (filteredContacts?.length ?? 0) > 0 && (
                <div className="space-y-1 p-2">
                  {filteredContacts?.map((contact) => {
                    const isSelected = selectedContacts.some((c) => c.userId === contact.userId);
                    return (
                      <div
                        key={contact.userId}
                        className={`flex cursor-pointer items-center space-x-3 rounded-lg p-3 transition-colors ${
                          isSelected ? 'text-conveniat-green bg-green-100' : 'hover:bg-gray-100'
                        }`}
                        onClick={() => handleContactToggle(contact)}
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            isSelected
                              ? 'bg-conveniat-green text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          <span className="font-heading text-sm font-semibold">
                            {contact.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-body text-sm font-medium">{contact.name}</p>
                        </div>
                        {isSelected && (
                          <div className="bg-conveniat-green flex h-5 w-5 items-center justify-center rounded-full">
                            <span className="text-xs text-white">✓</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
