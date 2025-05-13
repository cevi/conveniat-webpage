'use client';
import type React from 'react';
import { useState } from 'react';

import { Button } from '@/components/ui/buttons/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useChatUser } from '@/features/chat/hooks/use-chat-user';
import { useUpdateChat } from '@/features/chat/hooks/use-update-chat';
import type { ChatDetail } from '@/features/chat/types/chat';
import { Separator } from '@radix-ui/react-select';
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
      <DialogContent className="sm:max-w-md z-[999] bg-white">
        <DialogHeader>
          <DialogTitle>Chat Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <div className="font-medium text-sm text-gray-500">Chat Name</div>
            {isGroupChat && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="h-8 px-2"
              >
                {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
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
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleSaveName}
                disabled={chatName.trim() === '' || chatName === chatDetails.name}
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="text-lg font-semibold">{chatDetails.name}</div>
          )}

          <Separator />

          <div>
            <div className="font-medium text-sm text-gray-500 mb-2">
              {chatDetails.participants.length} Participants
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {chatDetails.participants.map((participant) => (
                <div key={participant.id} className="flex items-center gap-3">
                  <UserCircle className="h-8 w-8 text-gray-400" />
                  <div>
                    <div className="font-medium">
                      {participant.name}
                      {participant.id === currentUser && ' (You)'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {participant.isOnline ? (
                        <span className="text-green-500">Online</span>
                      ) : (
                        'Offline'
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
