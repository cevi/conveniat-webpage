'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { trpc } from '@/trpc/client';
import { cn } from '@/utils/tailwindcss-override';
import { Check, Circle, Loader2 } from 'lucide-react';
import React, { useState } from 'react';

interface AlertQuestionMessageProperties {
  message: ChatMessage;
  isCurrentUser: boolean;
}

interface QuestionPayload {
  question: string;
  options: string[];
  selectedOption: string | null;
  questionRefId?: string;
}

export const AlertQuestionMessage: React.FC<AlertQuestionMessageProperties> = ({
  message,
  isCurrentUser,
}) => {
  const chatId = useChatId();
  const payload = message.messagePayload as unknown as QuestionPayload;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optimisticSelection, setOptimisticSelection] = useState<string | undefined>();

  const currentSelection = payload.selectedOption ?? optimisticSelection;
  const hasAnswered = !!currentSelection;
  const canAnswer = isCurrentUser && !hasAnswered;

  const trpcUtils = trpc.useUtils();
  const updateMessageContext = trpc.chat.updateMessageContent.useMutation({
    onSuccess: () => {
      setIsSubmitting(false);
      void trpcUtils.chat.infiniteMessages.invalidate({ chatId });
      void trpcUtils.admin.getChatMessages.invalidate({ chatId });
    },
    onError: (error) => {
      setIsSubmitting(false);
      setOptimisticSelection(undefined);
      console.error('Failed to update message:', error);
      // Optional: Show toast error here
    },
  });

  const handleSelectOption = (option: string): void => {
    if (!canAnswer || isSubmitting) return;
    setIsSubmitting(true);
    setOptimisticSelection(option);

    // We need to construct the new payload
    const newPayload = {
      ...payload,
      selectedOption: option,
    };

    updateMessageContext.mutate({ messageId: message.id, content: newPayload });
  };

  return (
    <div className="flex min-w-[200px] flex-col space-y-2 p-1">
      <h3 className="font-semibold text-[var(--theme-text)]">{payload.question}</h3>
      <div className="flex flex-col space-y-2">
        {payload.options.map((option) => {
          const isSelected = currentSelection === option;
          const isSelectable = canAnswer;

          return (
            <button
              key={option}
              onClick={() => handleSelectOption(option)}
              disabled={!isSelectable && !isSelected}
              className={cn(
                'flex items-center space-x-2 rounded-md border p-2 text-left transition-colors',
                isSelected
                  ? 'bg-conveniat-green/10 border-conveniat-green text-conveniat-green'
                  : 'border-[var(--theme-elevation-150)] bg-[var(--theme-elevation-50)] text-[var(--theme-text)] hover:bg-[var(--theme-elevation-100)]',
                !isSelectable &&
                  !isSelected &&
                  'cursor-not-allowed opacity-50 hover:bg-[var(--theme-elevation-50)]',
              )}
            >
              {isSelected ? (
                <div className="bg-conveniat-green rounded-full p-0.5">
                  {isSubmitting ? (
                    <Loader2 className="h-3 w-3 animate-spin text-white" />
                  ) : (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
              ) : (
                <Circle
                  className={cn('h-4 w-4', isSelectable ? 'text-gray-400' : 'text-gray-200')}
                />
              )}
              <span className="text-sm">{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
