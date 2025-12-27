'use client';

import { Button } from '@/components/ui/buttons/button';
import { cn } from '@/utils/tailwindcss-override';
import { Loader2, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';

interface ChatLinkButtonProperties {
  userId: string;
  label?: string;
  className?: string;
}

/**
 * A button that navigates to a new chat with a user, with loading feedback.
 */
export const ChatLinkButton: React.FC<ChatLinkButtonProperties> = ({
  userId,
  label = 'Chat',
  className,
}) => {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleClick = (): void => {
    setIsNavigating(true);
    router.push(`/app/chat/new-chat-with-user/${userId}`);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        'h-9 gap-2 transition-all duration-200 active:scale-95',
        isNavigating && 'opacity-80',
        className,
      )}
      onClick={handleClick}
      disabled={isNavigating}
    >
      {isNavigating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageSquare className="h-4 w-4" />
      )}
      {label}
    </Button>
  );
};
