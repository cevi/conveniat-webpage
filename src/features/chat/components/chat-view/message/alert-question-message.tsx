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
  // Options may be simple strings (legacy) or objects with `id` and `option`.
  options: Array<string | { id?: string | null; option: string }>;
  selectedOption: string | null;
  questionRefId?: string;
}

export const AlertQuestionMessage: React.FC<AlertQuestionMessageProperties> = ({ message }) => {
  const chatId = useChatId();
  const payload = message.messagePayload as unknown as QuestionPayload;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optimisticSelection, setOptimisticSelection] = useState<string | undefined>();
  const [optimisticSelectionId, setOptimisticSelectionId] = useState<string | undefined>();

  const currentSelection = payload.selectedOption ?? optimisticSelection;
  const hasAnswered = !!currentSelection;
  const canAnswer = !hasAnswered;

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

  const handleSelectOption = (optionLabel: string, optionId?: string | null): void => {
    if (!canAnswer || isSubmitting) return;
    setIsSubmitting(true);
    setOptimisticSelection(optionLabel);
    setOptimisticSelectionId(optionId ?? undefined);

    // We need to construct the new payload
    const newPayload = {
      ...payload,
      selectedOption: optionLabel,
      // send the id when available so server can resolve branching
      selectedOptionId: optionId ?? undefined,
    };

    updateMessageContext.mutate({ messageId: message.id, content: newPayload });
  };

  return (
    <div className="flex min-w-[200px] flex-col space-y-2.5 p-1">
      <h3 className="font-semibold text-[var(--theme-text)]">{payload.question}</h3>
      <div className="flex flex-col space-y-2">
        {payload.options.map((opt) => {
          const optionLabel = typeof opt === 'string' ? opt : opt.option;
          const optionId = typeof opt === 'string' ? undefined : opt.id ?? undefined;
          const isSelected = currentSelection === optionLabel;
          const isSelectable = canAnswer;

          return (
            <button
              key={optionId ?? optionLabel}
              onClick={() => handleSelectOption(optionLabel, optionId)}
              disabled={!isSelectable && !isSelected}
              className={cn(
                'group flex items-center space-x-3 rounded-xl border-2 px-4 py-3 text-left transition-all duration-200',
                isSelected
                  ? 'border-conveniat-green bg-conveniat-green/10 text-conveniat-green shadow-sm'
                  : 'border-gray-200 bg-white text-[var(--theme-text)]',
                isSelectable &&
                  !isSelected &&
                  'cursor-pointer hover:border-gray-300 hover:bg-gray-50 hover:shadow-md active:scale-[0.98]',
                !isSelectable && !isSelected && 'cursor-not-allowed opacity-50',
              )}
            >
              {isSelected ? (
                <div className="bg-conveniat-green flex h-5 w-5 shrink-0 items-center justify-center rounded-full shadow-sm">
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  ) : (
                    <Check className="h-3.5 w-3.5 text-white" />
                  )}
                </div>
              ) : (
                <div
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200',
                    isSelectable
                      ? 'border-gray-300 group-hover:border-gray-400'
                      : 'border-gray-200',
                  )}
                >
                  <Circle className="h-0 w-0" />
                </div>
              )}
              <span className="text-sm font-medium">{optionLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
