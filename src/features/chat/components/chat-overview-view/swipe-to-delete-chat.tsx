'use client';

import { useArchiveChatMutation } from '@/features/chat/hooks/use-archive-chat-mutation';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma';
import { cn } from '@/utils/tailwindcss-override';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';

interface SwipeToDeleteChatProperties {
  chat: ChatWithMessagePreview;
  children: React.ReactNode;
}

const DELETE_THRESHOLD_PERCENT = 0.4;

export const SwipeToDeleteChat: React.FC<SwipeToDeleteChatProperties> = ({ chat, children }) => {
  const deleteChatMutation = useArchiveChatMutation();
  const draggingX = useMotionValue(0);
  const containerReference = useRef<HTMLDivElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [pastThreshold, setPastThreshold] = useState(false);

  const canDelete =
    chat.chatType !== ChatType.ANNOUNCEMENT &&
    (chat.chatType === ChatType.EMERGENCY ||
      (
        [
          ChatMembershipPermission.OWNER,
          ChatMembershipPermission.ADMIN,
        ] as ChatMembershipPermission[]
      ).includes(chat.userChatPermission));

  const binOpacity = useTransform(draggingX, [0, 30], [0, 1]);
  const binScale = useTransform(draggingX, [0, 80, 160], [0.8, 1, 1.25]);

  const handleDragStart = useCallback((): void => {
    setIsSwiping(true);
  }, []);

  const handleDrag = useCallback((_: unknown, info: { offset: { x: number } }): void => {
    const containerWidth = containerReference.current?.offsetWidth ?? 0;
    const threshold = containerWidth * DELETE_THRESHOLD_PERCENT;
    const isPast = info.offset.x >= threshold;
    setPastThreshold(isPast);
  }, []);

  const handleDragEnd = async (_: unknown, info: { offset: { x: number } }): Promise<void> => {
    setIsSwiping(false);
    setPastThreshold(false);
    if (isDeleting) return;

    const containerWidth = containerReference.current?.offsetWidth ?? 0;
    const threshold = containerWidth * DELETE_THRESHOLD_PERCENT;

    if (info.offset.x >= threshold && canDelete) {
      setIsDeleting(true);

      // Stage 1: Fast slide off-screen to the right (Gmail style)
      await animate(draggingX, containerWidth * 1.25, {
        duration: 0.18,
        ease: 'easeOut',
      });

      // Stage 2: Trigger mutation (height collapse handles removal visually)
      deleteChatMutation.mutate({ chatUuid: chat.id });
    } else {
      // Snap back if threshold not met or delete not allowed
      animate(draggingX, 0, { type: 'spring', stiffness: 450, damping: 32 });
    }
  };

  return (
    <motion.div
      ref={containerReference}
      initial={false}
      animate={
        isDeleting
          ? { height: 0, opacity: 0, marginTop: 0, marginBottom: 0 }
          : { height: 'auto', opacity: 1 }
      }
      transition={{
        height: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
        opacity: { duration: 0.18, ease: 'easeOut' },
      }}
      className="relative overflow-hidden rounded-md"
    >
      <div
        className={cn(
          'absolute inset-y-0 left-0 flex w-full items-center justify-start rounded-md pl-6 transition-colors duration-150',
          canDelete ? (pastThreshold ? 'bg-red-500' : 'bg-red-100') : 'bg-gray-100',
        )}
      >
        <motion.div style={{ opacity: binOpacity, scale: binScale }}>
          <div className="relative">
            <Trash2
              className={cn(
                'h-6 w-6 transition-colors duration-150',
                canDelete ? (pastThreshold ? 'text-white' : 'text-red-600') : 'text-gray-400',
              )}
            />
            {!canDelete && (
              <svg
                className="absolute inset-0 h-6 w-6 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" y1="4" x2="20" y2="20" />
              </svg>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div
        drag={isDeleting ? false : 'x'}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ right: 0.35, left: 0 }}
        dragDirectionLock
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={(event_, info) => void handleDragEnd(event_, info)}
        style={{
          x: draggingX,
          touchAction: isSwiping ? 'none' : 'pan-y',
        }}
        className="relative z-10 select-none"
        whileTap={{ cursor: 'grabbing' }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};
