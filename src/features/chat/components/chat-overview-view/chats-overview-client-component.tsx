'use client';
import { Button } from '@/components/ui/buttons/button';
import { Input } from '@/components/ui/input';
import { ChatPreview } from '@/features/chat/components/chat-overview-view/chat-preview';
import { NewChatDialog } from '@/features/chat/components/chat-overview-view/new-chat-dialog';
import { useChats } from '@/features/chat/hooks/use-chats';
import { Search } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

export const ChatsOverviewClientComponent: React.FC = () => {
  const { data: chats, isLoading } = useChats();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter chats based on search query
  const filteredChats = chats?.filter(
    (chat) =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-col space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search chats..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex justify-end">
        <NewChatDialog />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
        </div>
      ) : filteredChats?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">No chats found</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchQuery ? 'Try a different search term' : 'Start a new conversation'}
          </p>
          {searchQuery && (
            <Button variant="outline" className="mt-4" onClick={() => setSearchQuery('')}>
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-800 rounded-md border border-gray-200 dark:border-gray-800">
          {filteredChats?.map((chat) => <ChatPreview key={chat.id} chat={chat} />)}
        </ul>
      )}
    </div>
  );
};
