'use client';

import { useArchiveChatMutation } from '@/features/chat/hooks/use-archive-chat-mutation';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import type React from 'react';
import { useRef, useState } from 'react';

interface SwipeToDeleteChatProperties {
  chat: ChatWithMessagePreview;
  children: React.ReactNode;
}

const DELETE_THRESHOLD_PERCENT = 0.75;

export const SwipeToDeleteChat: React.FC<SwipeToDeleteChatProperties> = ({ chat, children }) => {
  const deleteChatMutation = useArchiveChatMutation();
  const draggingX = useMotionValue(0);
  const containerReference = useRef<HTMLDivElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete =
    chat.chatType === ChatType.EMERGENCY ||
    (
      [ChatMembershipPermission.OWNER, ChatMembershipPermission.ADMIN] as ChatMembershipPermission[]
    ).includes(chat.userChatPermission);

  const binOpacity = useTransform(draggingX, [0, 50], [0, 1]);
  const binScale = useTransform(draggingX, [0, 100], [0.8, 1.2]);

  const handleDragEnd = async (_: unknown, info: { offset: { x: number } }): Promise<void> => {
    if (!canDelete || isDeleting) return;

    const containerWidth = containerReference.current?.offsetWidth ?? 0;
    const threshold = containerWidth * DELETE_THRESHOLD_PERCENT;

    if (info.offset.x >= threshold) {
      setIsDeleting(true);
      // Animate off-screen to the right
      await animate(draggingX, containerWidth + 50, {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      });
      deleteChatMutation.mutate({ chatUuid: chat.id });
    } else {
      // Snap back
      animate(draggingX, 0, { type: 'spring', stiffness: 500, damping: 30 });
    }
  };

  if (!canDelete) {
    return <>{children}</>;
  }

  return (
    <div ref={containerReference} className="relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 flex w-full items-center justify-start rounded-md bg-red-100 pl-6">
        <motion.div style={{ opacity: binOpacity, scale: binScale }}>
          <Trash2 className="h-6 w-6 text-red-600" />
        </motion.div>
      </div>

      <motion.div
        drag={isDeleting ? false : 'x'}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ right: 0.5, left: 0 }}
        dragDirectionLock
        onDragEnd={(event_, info) => void handleDragEnd(event_, info)}
        style={{ x: draggingX }}
        className="relative z-10"
        whileTap={{ cursor: 'grabbing' }}
      >
        {children}
      </motion.div>
    </div>
  );
};
