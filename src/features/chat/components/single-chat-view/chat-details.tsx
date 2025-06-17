'use client';
import type React from 'react';
import { useState } from 'react';

import { Button } from '@/components/ui/buttons/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useChatUser } from '@/features/chat/hooks/use-chat-user';
import { useUpdateChat } from '@/features/chat/hooks/use-update-chat';
import type { ChatDetail } from '@/features/chat/types/chat';
import { Check, Pencil, UserCircle, X } from 'lucide-react';

interface ChatDetailsProperties {
  chatDetails: ChatDetail;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatDetails: React.FC<ChatDetailsProperties> = ({ chatDetails, isOpen, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [chatName, setChatName] = useState(chatDetails.name);
  const { data: currentUser } = useChatUser();
  const updateChatMutation = useUpdateChat();

  const isGroupChat = chatDetails.participants.length > 2;

  const handleSaveName = (): void => {
    if (chatName.trim() !== '' && chatName !== chatDetails.name) {
      updateChatMutation.mutate({
        chatId: chatDetails.id,
        name: chatName.trim(),
      });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') {
      handleSaveName();
    } else if (event.key === 'Escape') {
      setChatName(chatDetails.name);
      setIsEditing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="z-[999] border border-gray-200 bg-white shadow-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-gray-900">Chat Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="font-body text-sm font-medium text-gray-600">Chat Name</div>
            {isGroupChat && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="h-8 px-2 hover:bg-gray-100"
              >
                {isEditing ? (
                  <X className="h-4 w-4 text-gray-600" />
                ) : (
                  <Pencil className="h-4 w-4 text-gray-600" />
                )}
              </Button>
            )}
          </div>

          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={chatName}
                onChange={(event) => setChatName(event.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="font-body focus:border-conveniat-green focus:ring-conveniat-green flex-1 border-gray-300"
              />
              <Button
                size="sm"
                onClick={handleSaveName}
                disabled={chatName.trim() === '' || chatName === chatDetails.name}
                className="bg-conveniat-green hover:bg-green-600"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="font-heading text-lg font-semibold text-gray-900">
              {chatDetails.name}
            </div>
          )}

          <div className="h-px bg-gray-200" />

          <div>
            <div className="font-body mb-4 text-sm font-medium text-gray-600">
              {chatDetails.participants.length} Participants
            </div>
            <div className="max-h-60 space-y-4 overflow-y-auto">
              {chatDetails.participants.map((participant) => (
                <div key={participant.id} className="flex items-center gap-3">
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
                    <div className="font-body text-sm">
                      {participant.isOnline ? (
                        <span className="text-green-600">Online</span>
                      ) : (
                        <span className="text-gray-500">Offline</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
