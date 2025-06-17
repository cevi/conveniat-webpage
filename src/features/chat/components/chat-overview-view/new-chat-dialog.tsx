'use client';
import { Button } from '@/components/ui/buttons/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { createChat } from '@/features/chat/api/create-chat';
import type { Contact } from '@/features/chat/api/get-contacts';
import { CHATS_QUERY_KEY, useAllContacts } from '@/features/chat/hooks/use-chats';
import { useQueryClient } from '@tanstack/react-query';
import { MessageSquarePlus, Search, Users, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';

export const NewChatDialog: React.FC = () => {
  const { data: allContacts, isLoading } = useAllContacts();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [groupChatName, setGroupChatName] = useState('');
  const queryClient = useQueryClient();

  // Filter contacts based on search query
  const filteredContacts = allContacts?.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSelectedContacts([]);
      setGroupChatName('');
    }
  }, [open]);

  const handleContactToggle = (contact: Contact): void => {
    setSelectedContacts((previous) => {
      const isSelected = previous.some((c) => c.uuid === contact.uuid);
      return isSelected ? previous.filter((c) => c.uuid !== contact.uuid) : [...previous, contact];
    });
  };

  const handleCreateChat = async (): Promise<void> => {
    if (selectedContacts.length === 0) {
      return;
    }

    try {
      const chatName: string | undefined =
        selectedContacts.length > 1 && groupChatName.trim() !== ''
          ? groupChatName.trim()
          : undefined;

      await createChat(selectedContacts, chatName);
      await queryClient.invalidateQueries({ queryKey: CHATS_QUERY_KEY });

      setOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const isGroupChat = selectedContacts.length > 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <MessageSquarePlus size={16} />
          <span>New Chat</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="border border-gray-200 bg-white shadow-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-gray-900">Create New Chat</DialogTitle>
          <DialogDescription className="font-body text-gray-600">
            Select contacts to start a new conversation.
          </DialogDescription>
        </DialogHeader>

        {/* Group Chat Name Input */}
        {isGroupChat && (
          <div className="space-y-2">
            <label className="font-body text-sm font-medium text-gray-700">Group Chat Name</label>
            <Input
              placeholder="Enter group name (optional)"
              value={groupChatName}
              onChange={(changeEvent) => setGroupChatName(changeEvent.target.value)}
              className="font-body focus:border-conveniat-green focus:ring-conveniat-green border-gray-300"
            />
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search contacts..."
            className="font-body focus:border-conveniat-green focus:ring-conveniat-green border-gray-300 pl-10"
            value={searchQuery}
            onChange={(changeEvent) => setSearchQuery(changeEvent.target.value)}
          />
        </div>

        {/* Selected Contacts */}
        {selectedContacts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-conveniat-green" />
              <span className="font-body text-sm font-medium text-gray-700">
                Selected: {selectedContacts.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedContacts.map((contact) => (
                <div
                  key={contact.uuid}
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
        <div className="h-[300px] overflow-hidden rounded-lg border border-gray-200">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="border-t-conveniat-green h-6 w-6 animate-spin rounded-full border-2 border-gray-300"></div>
                <p className="font-body text-sm text-gray-600">Loading contacts...</p>
              </div>
            </div>
          )}

          {!isLoading && filteredContacts?.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <p className="font-body text-sm text-gray-500">No contacts found</p>
            </div>
          )}

          {!isLoading && (filteredContacts?.length ?? 0) > 0 && (
            <div className="h-full space-y-1 overflow-y-auto p-2">
              {filteredContacts?.map((contact) => {
                const isSelected = selectedContacts.some((c) => c.uuid === contact.uuid);
                return (
                  <div
                    key={contact.uuid}
                    className={`flex cursor-pointer items-center space-x-3 rounded-lg p-3 transition-colors ${
                      isSelected ? 'text-conveniat-green bg-green-100' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => handleContactToggle(contact)}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        isSelected ? 'bg-conveniat-green text-white' : 'bg-gray-200 text-gray-600'
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

        <DialogFooter className="flex gap-3 sm:justify-between">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="font-body border-gray-300 hover:bg-gray-100"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleCreateChat().catch(console.error);
            }}
            disabled={selectedContacts.length === 0}
            className="bg-conveniat-green font-body hover:bg-green-600 disabled:bg-gray-300"
          >
            Create Chat ({selectedContacts.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
