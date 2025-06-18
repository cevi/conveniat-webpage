'use client';
import { Button } from '@/components/ui/buttons/button';
import { Input } from '@/components/ui/input';
import { ChatPreview } from '@/features/chat/components/chat-overview-view/chat-preview';
import { useChats } from '@/features/chat/hooks/use-chats';
import type { ChatDto } from '@/features/chat/types/api-dto-types';
import { MessageSquare, Search } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useState } from 'react';

const ChatsOverviewLoadingPlaceholder: React.FC = () => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="border-t-conveniat-green h-8 w-8 animate-spin rounded-full border-2 border-gray-300"></div>
        <p className="font-body text-sm text-gray-600">Loading your conversations...</p>
      </div>
    </div>
  );
};

// eslint-disable-next-line complexity
export const ChatsOverviewClientComponent: React.FC = () => {
  const { data: chats, isLoading } = useChats();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter chats based on search query
  const filteredChats: ChatDto[] =
    chats?.filter(
      (chat) =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase()),
    ) ?? [];

  return (
    <div className="flex flex-col space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search conversations..."
          className="font-body focus:border-conveniat-green focus:ring-conveniat-green border-gray-300 bg-white pl-10"
          value={searchQuery}
          onChange={(changeEvent) => setSearchQuery(changeEvent.target.value)}
        />
      </div>

      {/* New Chat Button */}
      <Link className="flex justify-end" href="/app/chat/new">
        New Chat
      </Link>

      {/* Loading State */}
      {isLoading && <ChatsOverviewLoadingPlaceholder />}

      {/* Empty State */}
      {!isLoading && filteredChats.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-200">
            <MessageSquare className="h-8 w-8 text-gray-500" />
          </div>
          <p className="font-heading text-lg font-semibold text-gray-700">
            {searchQuery === '' ? 'No conversations yet' : 'No chats found'}
          </p>
          <p className="font-body mt-2 text-sm text-gray-500">
            {searchQuery === ''
              ? 'Start a new conversation to get chatting'
              : 'Try adjusting your search terms'}
          </p>
          {searchQuery !== '' && (
            <Button
              variant="outline"
              className="font-body mt-4 border-gray-300 hover:bg-gray-100"
              onClick={() => setSearchQuery('')}
            >
              Clear search
            </Button>
          )}
        </div>
      )}

      {/* Chat List */}
      {!isLoading && filteredChats.length > 0 && (
        <div className="space-y-2">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className="rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <ChatPreview chat={chat} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
