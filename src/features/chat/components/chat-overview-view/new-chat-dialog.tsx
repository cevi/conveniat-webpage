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
import { MessageSquarePlus, Search, Users } from 'lucide-react';
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
      // TODO handle error
    }

    try {
      // If it's a group chat and has a name, pass it to the createChat function
      const chatName: string | undefined =
        selectedContacts.length > 1 && groupChatName.trim() !== ''
          ? groupChatName.trim()
          : undefined;

      await createChat(selectedContacts, chatName);
      await queryClient.invalidateQueries({ queryKey: CHATS_QUERY_KEY });

      // TODO handle error

      setOpen(false);
    } catch (error) {
      console.error(error);
      // TODO handle error
    }
  };

  const isGroupChat = selectedContacts.length > 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <MessageSquarePlus size={16} />
          <span>New Chat</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Create New Chat</DialogTitle>
          <DialogDescription>Select contacts to start a new conversation.</DialogDescription>
        </DialogHeader>

        {isGroupChat && (
          <div className="mb-4">
            <div>Group Chat Name</div>
            <Input
              id="group-name"
              placeholder="Enter group name (optional)"
              value={groupChatName}
              onChange={(changeEvent) => setGroupChatName(changeEvent.target.value)}
            />
          </div>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search contacts..."
            className="pl-10"
            value={searchQuery}
            onChange={(changeEvent) => setSearchQuery(changeEvent.target.value)}
          />
        </div>

        {selectedContacts.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-500" />
              <span className="text-sm font-medium">Selected: {selectedContacts.length}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedContacts.map((contact) => (
                <div
                  key={contact.uuid}
                  className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  <span>{contact.name}</span>
                  <button
                    onClick={() => handleContactToggle(contact)}
                    className="ml-1 rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="h-[300px] pr-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
            </div>
          )}
          {!isLoading && filteredContacts?.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-500">No contacts found</p>
          )}

          {!isLoading && (filteredContacts?.length ?? 0) > 0 && (
            <div className="space-y-2 overflow-y-scroll h-full">
              {filteredContacts?.map((contact) => (
                <div
                  key={contact.uuid}
                  className="flex items-center space-x-2 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleContactToggle(contact)}
                >
                  <div className="flex flex-1 cursor-pointer items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{contact.name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={(): void => {
              handleCreateChat().catch(console.error);
            }}
            disabled={selectedContacts.length === 0}
          >
            Create Chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
