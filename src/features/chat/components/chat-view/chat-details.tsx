'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/buttons/button';
import { Input } from '@/components/ui/input';
import type { Contact } from '@/features/chat/api/queries/list-contacts';
import { DeleteChat } from '@/features/chat/components/chat-details-view/delete-chat';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useAddParticipants } from '@/features/chat/hooks/use-add-participants';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { useRemoveParticipants } from '@/features/chat/hooks/use-remove-participant';
import { useUpdateChatMutation } from '@/features/chat/hooks/use-update-chat-mutation';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import {
  ArrowLeft,
  Check,
  Loader2,
  Pencil,
  Search,
  Settings,
  UserCircle,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';

const chatNamePlaceholder: StaticTranslationString = {
  de: 'Chat-Namen eingeben',
  en: 'Enter chat name',
  fr: 'Entrez le nom du chat',
};

const chatNameLengthText: StaticTranslationString = {
  de: 'Chat-Name muss zwischen 2-50 Zeichen lang sein',
  en: 'Chat name must be between 2-50 characters',
  fr: 'Le nom du chat doit contenir entre 2 et 50 caractères',
};

const loadingContactsText: StaticTranslationString = {
  de: 'Kontakte werden geladen...',
  en: 'Loading contacts...',
  fr: 'Chargement des contacts...',
};

const searchContactsPlaceholder: StaticTranslationString = {
  de: 'Kontakte suchen...',
  en: 'Search contacts to add...',
  fr: 'Rechercher des contacts à ajouter...',
};

const validationMessages = {
  emptyName: {
    de: 'Chat-Name darf nicht leer sein',
    en: 'Chat name cannot be empty',
    fr: 'Le nom du chat ne peut pas être vide',
  } as StaticTranslationString,
  tooShort: {
    de: 'Chat-Name muss mindestens 2 Zeichen haben',
    en: 'Chat name must be at least 2 characters',
    fr: 'Le nom du chat doit contenir au moins 2 caractères',
  } as StaticTranslationString,
  tooLong: {
    de: 'Chat-Name muss weniger als 50 Zeichen haben',
    en: 'Chat name must be less than 50 characters',
    fr: 'Le nom du chat doit contenir moins de 50 caractères',
  } as StaticTranslationString,
};

const saveText: StaticTranslationString = {
  de: 'Speichern',
  en: 'Save',
  fr: 'Enregistrer',
};

const chatNameSectionText: StaticTranslationString = {
  de: 'Chat-Name',
  en: 'Chat Name',
  fr: 'Nom du chat',
};

const participantsSectionText: StaticTranslationString = {
  de: 'Teilnehmer',
  en: 'Participants',
  fr: 'Participants',
};

const doneText: StaticTranslationString = {
  de: 'Fertig',
  en: 'Done',
  fr: 'Terminé',
};

const manageText: StaticTranslationString = {
  de: 'Verwalten',
  en: 'Manage',
  fr: 'Gérer',
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

const youText: StaticTranslationString = {
  de: 'Du',
  en: 'You',
  fr: 'Vous',
};

const ChatDetailsPageSkeleton: React.FC = () => (
  <div className="fixed top-0 z-[500] flex h-dvh w-screen flex-col bg-gray-50 xl:top-[62px] xl:left-[480px] xl:h-[calc(100dvh-62px)] xl:w-[calc(100dvw-480px)]">
    <div className="flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 shadow-sm">
      <div className="h-8 w-8 animate-pulse rounded bg-gray-200" />
      <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
    </div>
    <div className="flex-1 space-y-6 overflow-y-auto p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
              <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const ChatDetailsError: React.FC = () => (
  <div className="fixed top-0 z-[500] flex h-dvh w-screen flex-col bg-gray-50 xl:top-[62px] xl:left-[480px] xl:h-[calc(100dvh-62px)] xl:w-[calc(100dvw-480px)]">
    <div className="flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 shadow-sm">
      <Link href="/app/chat">
        <Button variant="ghost" size="icon" className="mr-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </Button>
      </Link>
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-gray-700" />
        <h1 className="font-heading text-lg font-semibold text-gray-900">Chat Details</h1>
      </div>
    </div>
    <div className="flex flex-1 items-center justify-center p-4 text-center text-red-500">
      <span>
        <b>Error loading chat details.</b>
        <br />
        Please try again later.
      </span>
    </div>
  </div>
);

// Validate chat name
const validateChatName = (name: string, locale: Locale): string => {
  if (name.trim().length === 0) {
    return validationMessages.emptyName[locale];
  }
  if (name.trim().length < 2) {
    return validationMessages.tooShort[locale];
  }
  if (name.trim().length > 50) {
    return validationMessages.tooLong[locale];
  }
  return '';
};

// eslint-disable-next-line complexity
export const ChatDetails: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const chatId = useChatId();
  const { data: chatDetails, isLoading, isError } = useChatDetail(chatId);

  const [isEditingName, setIsEditingName] = useState(false);
  const [chatName, setChatName] = useState('');
  const [chatNameError, setChatNameError] = useState('');

  const [isManagingParticipants, setIsManagingParticipants] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactsToAdd, setSelectedContactsToAdd] = useState<Contact[]>([]);
  const { data: allContacts, isLoading: isLoadingContacts } = trpc.chat.contacts.useQuery({});
  const updateChatMutation = useUpdateChatMutation();
  const addParticipantsMutation = useAddParticipants();
  const removeParticipantMutation = useRemoveParticipants();
  const { data: currentUser } = trpc.chat.user.useQuery({});

  // Memoize the list of contacts that can be added (not already in the chat)
  const addableContacts = useMemo(() => {
    if (!allContacts) return [];
    const participantIds = new Set(chatDetails?.participants.map((p) => p.id) || []);
    return allContacts.filter(
      (contact) =>
        !participantIds.has(contact.userId) &&
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [allContacts, chatDetails, searchQuery]);

  // Initialize chat name when chatDetails loads
  useEffect(() => {
    if (chatDetails?.name) {
      setChatName(chatDetails.name);
    }
  }, [chatDetails?.name]);

  // Show loading state
  if (isLoading) return <ChatDetailsPageSkeleton />;

  // Show error state
  if (isError || !chatDetails) return <ChatDetailsError />;

  const isGroupChat = chatDetails.participants.length > 2;

  // --- Handlers for chat name editing ---
  const handleSaveName = (): void => {
    const error = validateChatName(chatName, locale);
    if (error) {
      setChatNameError(error);
      return;
    }

    if (chatName.trim() !== '' && chatName !== chatDetails.name) {
      updateChatMutation.mutate({ chatUuid: chatDetails.id, newName: chatName.trim() });
    } else {
      setIsEditingName(false);
    }
  };

  const handleCancelEdit = (): void => {
    setChatName(chatDetails.name);
    setIsEditingName(false);
    setChatNameError('');
  };

  const handleChatNameChange = (value: string): void => {
    setChatName(value);
    if (chatNameError) {
      setChatNameError('');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') handleSaveName();
    else if (event.key === 'Escape') handleCancelEdit();
  };

  // --- Start of new handlers for participant management ---
  const handleToggleContactSelection = (contact: Contact): void => {
    setSelectedContactsToAdd((previous) =>
      previous.some((c) => c.userId === contact.userId)
        ? previous.filter((c) => c.userId !== contact.userId)
        : [...previous, contact],
    );
  };

  const handleAddParticipants = (): void => {
    if (selectedContactsToAdd.length === 0) return;
    addParticipantsMutation.mutate({
      chatId: chatDetails.id,
      participantIds: selectedContactsToAdd.map((c) => c.userId),
    });
  };

  const handleRemoveParticipant = (participantId: string): void => {
    removeParticipantMutation.mutate({ chatId: chatDetails.id, participantId });
  };

  const isFormValid = !chatNameError && chatName.trim().length >= 2 && chatName.trim().length <= 50;

  return (
    <div className="fixed top-0 z-[500] flex h-dvh w-screen flex-col overflow-y-hidden bg-gray-50 xl:top-[62px] xl:left-[480px] xl:h-[calc(100dvh-62px)] xl:w-[calc(100dvw-480px)]">
      {/* Header */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 shadow-sm">
        <Link href={`/app/chat/${chatId}`}>
          <Button variant="ghost" size="icon" className="mr-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-700" />
          <h1 className="font-heading text-lg font-semibold text-gray-900">Chat Details</h1>
        </div>
        <div className="ml-auto">
          {isEditingName && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                className="font-body border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveName}
                disabled={!isFormValid || updateChatMutation.isPending}
                className="bg-conveniat-green font-body text-white hover:bg-green-600 disabled:bg-gray-300"
              >
                {saveText[locale]} {updateChatMutation.isPending ? '...' : ''}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* --- Chat Name Section --- */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-body text-sm font-medium text-gray-600">
                {chatNameSectionText[locale]}
              </div>
              {isGroupChat && !isEditingName && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingName(true)}
                  className="h-8 px-2 hover:bg-gray-100"
                >
                  <Pencil className="h-4 w-4 text-gray-600" />
                </Button>
              )}
            </div>
            {isEditingName ? (
              <div className="space-y-2">
                <Input
                  value={chatName}
                  onChange={(event) => handleChatNameChange(event.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className={`font-body focus:ring-conveniat-green ${
                    chatNameError
                      ? 'border-red-300 focus:border-red-500'
                      : 'focus:border-conveniat-green border-gray-300'
                  }`}
                  placeholder={chatNamePlaceholder[locale]}
                />
                {chatNameError && <p className="font-body text-sm text-red-600">{chatNameError}</p>}
                <p className="font-body text-xs text-gray-500">{chatNameLengthText[locale]}</p>
              </div>
            ) : (
              <div className="font-heading text-lg font-semibold text-gray-900">
                {chatDetails.name}
              </div>
            )}
          </div>

          {/* --- Participants Section --- */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-body text-sm font-medium text-gray-600">
                {chatDetails.participants.length} {participantsSectionText[locale]}
              </div>
              {isGroupChat && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsManagingParticipants(!isManagingParticipants)}
                  className="h-8 gap-2 px-2 hover:bg-gray-100"
                >
                  {isManagingParticipants ? doneText[locale] : manageText[locale]}
                  {isManagingParticipants ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Users className="h-4 w-4 text-gray-600" />
                  )}
                </Button>
              )}
            </div>

            {/* Existing Participants List */}
            <div className="max-h-60 space-y-3 overflow-y-auto">
              {chatDetails.participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between gap-3">
                  <div className="flex flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                      <UserCircle className="h-8 w-8 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-body font-medium text-gray-900">
                        {participant.name}
                        {participant.id === currentUser && (
                          <span className="ml-1 text-sm text-gray-500">
                            ({youText[locale]}, {participant.chatPermission})
                          </span>
                        )}
                        {participant.id !== currentUser && (
                          <span className="ml-1 text-sm text-gray-500">
                            ({participant.chatPermission})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isManagingParticipants && participant.id !== currentUser && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveParticipant(participant.id)}
                      disabled={removeParticipantMutation.isPending}
                      className="h-8 w-8 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      {removeParticipantMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserX className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* --- Add Participants Section (Visible only when managing) --- */}
          {isManagingParticipants && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="font-heading mb-4 text-lg font-semibold text-gray-900">
                Add Participants
              </h3>

              {/* Search Input for adding contacts */}
              <div className="relative mb-4">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder={searchContactsPlaceholder[locale]}
                  className="font-body focus:border-conveniat-green focus:ring-conveniat-green border-gray-300 pl-10"
                  value={searchQuery}
                  onChange={(changeEvent) => setSearchQuery(changeEvent.target.value)}
                />
              </div>

              {/* Selected contacts to add */}
              {selectedContactsToAdd.length > 0 && (
                <div className="mb-4 space-y-2">
                  <div className="font-body text-sm font-medium text-gray-700">
                    Selected: {selectedContactsToAdd.length}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedContactsToAdd.map((contact) => (
                      <div
                        key={contact.userId}
                        className="font-body text-conveniat-green flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm"
                      >
                        <span>{contact.name}</span>
                        <button
                          onClick={() => handleToggleContactSelection(contact)}
                          className="rounded-full p-0.5 hover:bg-green-200"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* List of addable contacts */}
              <div className="mb-4 h-[200px] space-y-1 overflow-y-auto rounded-md border p-2">
                {isLoadingContacts && (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {loadingContactsText[locale]}
                  </div>
                )}
                {!isLoadingContacts &&
                  (addableContacts.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-gray-500">
                      {searchQuery === ''
                        ? noContactsToAddText[locale]
                        : noContactsFoundText[locale]}
                    </div>
                  ) : (
                    addableContacts.map((contact) => {
                      const isSelected = selectedContactsToAdd.some(
                        (c) => c.userId === contact.userId,
                      );
                      return (
                        <div
                          key={contact.userId}
                          className={`flex cursor-pointer items-center justify-between space-x-3 rounded-lg p-3 transition-colors ${
                            isSelected ? 'text-conveniat-green bg-green-100' : 'hover:bg-gray-100'
                          }`}
                          onClick={() => handleToggleContactSelection(contact)}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                isSelected
                                  ? 'bg-conveniat-green text-white'
                                  : 'bg-gray-200 text-gray-600'
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
                onClick={handleAddParticipants}
                disabled={selectedContactsToAdd.length === 0 || addParticipantsMutation.isPending}
                className="bg-conveniat-green font-body w-full hover:bg-green-600 disabled:bg-gray-300"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {addParticipantsMutation.isPending
                  ? 'Adding...'
                  : `Add Selected (${selectedContactsToAdd.length})`}
              </Button>
            </div>
          )}

          {/* --- Archive Chat Section --- */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <DeleteChat />
          </div>
        </div>
      </div>
    </div>
  );
};
