'use client';

import { usePendingChatDeletionContext } from '@/features/chat/context/pending-chat-deletion-context';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { canDeleteChat } from '@/features/chat/utils/can-delete-chat';
import { cn } from '@/utils/tailwindcss-override';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';

interface SwipeToDeleteChatProperties {
  chat: ChatWithMessagePreview;
  children: React.ReactNode;
}

const DELETE_THRESHOLD_PERCENT = 0.35;

export const SwipeToDeleteChat: React.FC<SwipeToDeleteChatProperties> = ({ chat, children }) => {
  const { deleteChat } = usePendingChatDeletionContext();
  const draggingX = useMotionValue(0);
  const containerReference = useRef<HTMLDivElement>(null);
  const [pastThreshold, setPastThreshold] = useState(false);

  const canDelete = canDeleteChat(chat);

  // Transforms for right swipe (draggingX is positive)
  const binOpacity = useTransform(draggingX, [0, 30], [0, 1]);
  const binScale = useTransform(draggingX, [0, 80, 160], [0.8, 1, 1.2]);

  const handleDrag = useCallback((): void => {
    const currentX = draggingX.get();
    const containerWidth = containerReference.current?.offsetWidth ?? 0;
    const threshold = containerWidth * DELETE_THRESHOLD_PERCENT;
    const isPast = currentX >= threshold;
    setPastThreshold(isPast);
  }, [draggingX]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }): void => {
    setPastThreshold(false);

    const containerWidth = containerReference.current?.offsetWidth ?? 0;
    const threshold = containerWidth * DELETE_THRESHOLD_PERCENT;
    const isRightSwipe = info.offset.x > 0;
    const distanceMet = Math.abs(info.offset.x) >= threshold;

    // no question first: the list holds the delete back for a moment and offers to undo it
    if (isRightSwipe && distanceMet && canDelete) {
      deleteChat({ chatId: chat.id, forEveryone: chat.isArchived !== true });
    }
    animate(draggingX, 0, { type: 'spring', stiffness: 500, damping: 35 });
  };

  return (
    <div
      ref={containerReference}
      className="relative overflow-hidden"
      style={{ touchAction: 'pan-y' }}
    >
      {((): React.ReactElement => {
        // a delete is red, strong once it is past the threshold
        let trackBg = 'bg-quiet';
        let iconColor = 'text-green-500';
        if (canDelete) {
          trackBg = pastThreshold ? 'bg-danger' : 'bg-danger-soft';
          iconColor = pastThreshold ? 'text-white' : 'text-danger-text';
        }
        return (
          <div
            className={cn(
              'absolute inset-y-0 left-0 flex w-full items-center justify-start pl-6 transition-colors duration-200',
              trackBg,
            )}
          >
            <motion.div style={{ opacity: binOpacity, scale: binScale }}>
              <div className="relative">
                <Trash2 className={cn('h-6 w-6 transition-colors duration-200', iconColor)} />
                {canDelete ? undefined : (
                  <svg
                    className="absolute inset-0 h-6 w-6 text-green-500"
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
        );
      })()}

      {/* Foreground Draggable Card */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: canDelete ? 200 : 0 }}
        dragElastic={{ left: 0, right: 0.35 }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{
          x: draggingX,
          touchAction: 'pan-y',
        }}
        className="relative z-10 cursor-grab select-none active:cursor-grabbing"
      >
        {children}
      </motion.div>
    </div>
  );
};
