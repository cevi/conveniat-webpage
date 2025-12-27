'use client';

import type React from 'react';
import { useMemo, useState } from 'react';

import type { Contact } from '@/features/chat/api/queries/list-contacts';
import { DeleteChat } from '@/features/chat/components/chat-details-view/delete-chat';
import { AddParticipants } from '@/features/chat/components/chat-details-view/sections/add-participants';
import { ChatCapabilities } from '@/features/chat/components/chat-details-view/sections/chat-capabilities';
import { ChatDetailsHeader } from '@/features/chat/components/chat-details-view/sections/chat-details-header';
import { ChatNameSection } from '@/features/chat/components/chat-details-view/sections/chat-name-section';
import { ParticipantsList } from '@/features/chat/components/chat-details-view/sections/participants-list';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useAddParticipants } from '@/features/chat/hooks/use-add-participants';
import { useSuspenseChatDetail } from '@/features/chat/hooks/use-chats';
import { useRemoveParticipants } from '@/features/chat/hooks/use-remove-participant';
import { useUpdateChatMutation } from '@/features/chat/hooks/use-update-chat-mutation';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';

import { useCurrentLocale } from 'next-i18n-router/client';

export const ChatDetails: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const chatId = useChatId();
  // const { data: chatDetails, isLoading, isPending, isError } = useChatDetail(chatId);
  const [chatDetails] = useSuspenseChatDetail(chatId);

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
    const participantIds = new Set(chatDetails.participants.map((p) => p.id));
    return allContacts.filter(
      (contact) =>
        !participantIds.has(contact.userId) &&
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [allContacts, chatDetails, searchQuery]);

  const isGroupChat = chatDetails.participants.length > 2;

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

  return (
    <div className="fixed top-0 z-[100] flex h-dvh w-screen flex-col overflow-y-hidden bg-gray-50 xl:top-[62px] xl:left-[480px] xl:z-0 xl:h-[calc(100dvh-62px)] xl:w-[calc(100dvw-480px)]">
      {/* Header */}
      <ChatDetailsHeader
        chatId={chatId}
        isEditingName={false}
        onCancelEdit={() => {}}
        onSaveName={() => {}}
        isSaving={updateChatMutation.isPending}
        isFormValid
        locale={locale}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl space-y-6">
          <ChatNameSection
            currentName={chatDetails.name}
            isGroupChat={isGroupChat}
            isSaving={updateChatMutation.isPending}
            locale={locale}
            onSaveName={(newName) => {
              updateChatMutation.mutate({ chatUuid: chatDetails.id, newName });
            }}
          />

          {/* --- Participants Section --- */}
          <ParticipantsList
            participants={chatDetails.participants}
            currentUser={currentUser ?? ''}
            isGroupChat={isGroupChat}
            isManaging={isManagingParticipants}
            onToggleManage={() => setIsManagingParticipants(!isManagingParticipants)}
            onRemoveParticipant={handleRemoveParticipant}
            isRemoving={removeParticipantMutation.isPending}
            locale={locale}
          />

          {/* --- Add Participants Section (Visible only when managing) --- */}
          {isManagingParticipants && (
            <AddParticipants
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedContacts={selectedContactsToAdd}
              addableContacts={addableContacts}
              onToggleSelection={handleToggleContactSelection}
              onAddParticipants={handleAddParticipants}
              isLoadingContacts={isLoadingContacts}
              isAdding={addParticipantsMutation.isPending}
              locale={locale}
            />
          )}

          {/* --- Chat Capabilities Section --- */}
          <ChatCapabilities capabilities={chatDetails.capabilities} locale={locale} />

          {/* --- Archive Chat Section --- */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <DeleteChat />
          </div>
        </div>
      </div>
    </div>
  );
};
