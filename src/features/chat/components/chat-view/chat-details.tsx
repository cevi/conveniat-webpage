'use client';

import type React from 'react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/buttons/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Contact } from '@/features/chat/api/get-contacts';
import { useAddParticipants } from '@/features/chat/hooks/use-add-participants';
import { useChatUser } from '@/features/chat/hooks/use-chat-user';
import { CHATS_QUERY_KEY, useAllContacts } from '@/features/chat/hooks/use-chats';
import { useRemoveParticipants } from '@/features/chat/hooks/use-remove-participant';
import { useUpdateChat } from '@/features/chat/hooks/use-update-chat';
import type { ChatDetailDto } from '@/features/chat/types/api-dto-types';
import { useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Loader2,
  Pencil,
  Search,
  UserCircle,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';

interface ChatDetailsProperties {
  chatDetails: ChatDetailDto;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatDetails: React.FC<ChatDetailsProperties> = ({ chatDetails, isOpen, onClose }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [chatName, setChatName] = useState(chatDetails.name);

  // --- Start of new state and hooks ---
  const [isManagingParticipants, setIsManagingParticipants] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactsToAdd, setSelectedContactsToAdd] = useState<Contact[]>([]);

  const queryClient = useQueryClient();
  const { data: allContacts, isLoading: isLoadingContacts } = useAllContacts();
  const updateChatMutation = useUpdateChat();
  const addParticipantsMutation = useAddParticipants();
  const removeParticipantMutation = useRemoveParticipants();
  const { data: currentUser } = useChatUser();
  // --- End of new state and hooks ---

  const isGroupChat = chatDetails.participants.length > 2;

  // Memoize the list of contacts that can be added (not already in the chat)
  const addableContacts = useMemo(() => {
    if (!allContacts) return [];
    const participantIds = new Set(chatDetails.participants.map((p) => p.id));
    return allContacts.filter(
      (contact) =>
        !participantIds.has(contact.uuid) &&
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [allContacts, chatDetails.participants, searchQuery]);

  // --- Handlers for chat name editing ---
  const handleSaveName = (): void => {
    if (chatName.trim() !== '' && chatName !== chatDetails.name) {
      updateChatMutation.mutate(
        { chatId: chatDetails.id, name: chatName.trim() },
        {
          onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [CHATS_QUERY_KEY] });
          },
        },
      );
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') handleSaveName();
    else if (event.key === 'Escape') {
      setChatName(chatDetails.name);
      setIsEditingName(false);
    }
  };

  // --- Start of new handlers for participant management ---
  const handleToggleContactSelection = (contact: Contact): void => {
    setSelectedContactsToAdd((previous) =>
      previous.some((c) => c.uuid === contact.uuid)
        ? previous.filter((c) => c.uuid !== contact.uuid)
        : [...previous, contact],
    );
  };

  const handleAddParticipants = (): void => {
    if (selectedContactsToAdd.length === 0) return;
    addParticipantsMutation.mutate(
      {
        chatId: chatDetails.id,
        participantIds: selectedContactsToAdd.map((c) => c.uuid),
      },
      {
        onSuccess: () => {
          setSelectedContactsToAdd([]);
          setSearchQuery('');
          void queryClient.invalidateQueries({ queryKey: [CHATS_QUERY_KEY, chatDetails.id] });
        },
      },
    );
  };

  const handleRemoveParticipant = (participantId: string): void => {
    removeParticipantMutation.mutate(
      { chatId: chatDetails.id, participantId },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: [CHATS_QUERY_KEY, chatDetails.id] });
        },
      },
    );
  };

  const handleCloseDialog = (): void => {
    setIsManagingParticipants(false);
    setIsEditingName(false);
    setSearchQuery('');
    setSelectedContactsToAdd([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
      <DialogContent className="z-[999] border border-gray-200 bg-white shadow-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-gray-900">Chat Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* --- Chat Name Section --- */}
          <div className="flex items-center justify-between">
            <div className="font-body text-sm font-medium text-gray-600">Chat Name</div>
            {isGroupChat && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingName(!isEditingName)}
                className="h-8 px-2 hover:bg-gray-100"
              >
                {isEditingName ? (
                  <X className="h-4 w-4 text-gray-600" />
                ) : (
                  <Pencil className="h-4 w-4 text-gray-600" />
                )}
              </Button>
            )}
          </div>
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={chatName}
                onChange={(event) => setChatName(event.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="font-body focus:border-conveniat-green focus:ring-conveniat-green flex-1 border-gray-300"
              />
              <Button size="sm" onClick={handleSaveName} disabled={chatName.trim() === ''}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="font-heading text-lg font-semibold text-gray-900">
              {chatDetails.name}
            </div>
          )}

          <div className="h-px bg-gray-200" />

          {/* --- Participants Section --- */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="font-body text-sm font-medium text-gray-600">
                {chatDetails.participants.length} Participants
              </div>
              {isGroupChat && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsManagingParticipants(!isManagingParticipants)}
                  className="h-8 gap-2 px-2 hover:bg-gray-100"
                >
                  {isManagingParticipants ? 'Done' : 'Manage'}
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
                          <span className="ml-1 text-sm text-gray-500">(You)</span>
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
                      <UserX className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* --- Add Participants Section (Visible only when managing) --- */}
          {isManagingParticipants && (
            <div className="space-y-4 pt-4">
              <div className="h-px bg-gray-200" />
              <h3 className="font-heading text-lg font-semibold text-gray-900">Add Participants</h3>

              {/* Search Input for adding contacts */}
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search contacts to add..."
                  className="font-body focus:border-conveniat-green focus:ring-conveniat-green border-gray-300 pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* List of addable contacts */}
              <div className="h-[200px] space-y-1 overflow-y-auto rounded-md border p-1">
                {isLoadingContacts ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading contacts...
                  </div>
                ) : addableContacts.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    No contacts to add.
                  </div>
                ) : (
                  addableContacts.map((contact) => {
                    const isSelected = selectedContactsToAdd.some((c) => c.uuid === contact.uuid);
                    return (
                      <div
                        key={contact.uuid}
                        className={`flex cursor-pointer items-center justify-between space-x-3 rounded-lg p-2 transition-colors ${
                          isSelected ? 'bg-green-100' : 'hover:bg-gray-100'
                        }`}
                        onClick={() => handleToggleContactSelection(contact)}
                      >
                        <span className="font-body text-sm font-medium">{contact.name}</span>
                        {isSelected && <Check className="h-5 w-5 text-green-600" />}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Button */}
              <Button
                onClick={handleAddParticipants}
                disabled={selectedContactsToAdd.length === 0 || addParticipantsMutation.isPending}
                className="w-full"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add Selected ({selectedContactsToAdd.length})
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
