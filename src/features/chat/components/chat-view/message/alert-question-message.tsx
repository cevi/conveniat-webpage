'use client';
import { toast } from '@/components/ui/toast';
import type { ChatMessage } from '@/features/chat/api/types';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { chatErrorTexts } from '@/lib/chat-error-texts';
import { useTRPC } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { userErrorMessage } from '@/utils/user-error-message';
import { Check, Circle, Loader2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

interface AlertQuestionMessageProperties {
  message: ChatMessage;
  isCurrentUser: boolean;
  locale: Locale;
}

const answerFailedText: StaticTranslationString = {
  de: 'Deine Antwort konnte nicht gesendet werden. Versuche es nochmals.',
  en: 'Your answer could not be sent. Please try again.',
  fr: 'Ta réponse n’a pas pu être envoyée. Réessaie.',
};

interface OptionItem {
  id?: string | undefined;
  option: string;
}

export const AlertQuestionMessage: React.FC<AlertQuestionMessageProperties> = ({
  message,
  locale,
}) => {
  const trpc = useTRPC();
  const chatId = useChatId();
  const rawPayload = message.messagePayload;

  const payload = useMemo<Record<string, unknown>>(() => {
    if (typeof rawPayload === 'object') {
      return rawPayload as Record<string, unknown>;
    }
    return {};
  }, [rawPayload]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optimisticSelection, setOptimisticSelection] = useState<string | undefined>();

  const rawSelectedOption =
    typeof payload['selectedOption'] === 'string' ? payload['selectedOption'] : undefined;
  const currentSelection = rawSelectedOption ?? optimisticSelection;
  const hasAnswered = typeof currentSelection === 'string' && currentSelection.length > 0;
  const canAnswer = !hasAnswered;

  const rawOptions = useMemo<unknown[]>(() => {
    const optionsList = payload['options'];
    return Array.isArray(optionsList) ? optionsList : [];
  }, [payload]);

  const normalizedOptions = useMemo<OptionItem[]>(() => {
    return rawOptions.map((optItem) => {
      if (typeof optItem === 'string') {
        return { id: undefined, option: optItem };
      }
      if (optItem !== null && typeof optItem === 'object') {
        const o = optItem as Record<string, unknown>;
        const optText = typeof o['option'] === 'string' ? o['option'] : '';
        const optId = typeof o['id'] === 'string' ? o['id'] : undefined;
        return { id: optId, option: optText };
      }
      return { id: undefined, option: '' };
    });
  }, [rawOptions]);

  const queryClient = useQueryClient();
  const updateMessageContext = useMutation(
    trpc.chat.updateMessageContent.mutationOptions({
      onSuccess: () => {
        setIsSubmitting(false);
        void queryClient.invalidateQueries(
          trpc.chat.infiniteMessages.infiniteQueryFilter({ chatId }),
        );
        void queryClient.invalidateQueries(trpc.admin.getChatMessages.queryFilter({ chatId }));
      },
      onError: (error) => {
        setIsSubmitting(false);
        setOptimisticSelection(undefined);
        toast.error(userErrorMessage(error, locale, chatErrorTexts, answerFailedText));
        console.error('Failed to update message:', error);
      },
    }),
  );

  const handleSelectOption = (optItem: OptionItem): void => {
    if (!canAnswer || isSubmitting) return;
    setIsSubmitting(true);
    setOptimisticSelection(optItem.option);

    updateMessageContext.mutate({
      messageId: message.id,
      content: { selectedOption: optItem.option, selectedOptionId: optItem.id },
    });
  };

  const questionTitle = typeof payload['question'] === 'string' ? payload['question'] : '';

  return (
    <div className="flex min-w-[200px] flex-col space-y-2.5 p-1">
      <h3 className="text-heading text-[15px] font-semibold">{questionTitle}</h3>
      <div className="flex flex-col space-y-2">
        {normalizedOptions.map((item) => {
          const isSelected = currentSelection === item.option;
          const isSelectable = canAnswer;

          return (
            <button
              key={`${item.id ?? ''}-${item.option}`}
              onClick={() => handleSelectOption(item)}
              disabled={!isSelectable && !isSelected}
              // the app's choice rows; the admin's chat view shows the same, as the user decided
              className={cn(
                'group flex min-h-[44px] items-center gap-3 rounded-[12px] border px-3.5 py-2.5 text-left text-green-900 transition-colors',
                isSelected ? 'border-conveniat-green bg-tint' : 'border-line bg-white',
                isSelectable && !isSelected && 'hover:bg-quiet cursor-pointer',
                !isSelectable && !isSelected && 'cursor-not-allowed opacity-50',
              )}
            >
              {isSelected ? (
                <div className="bg-conveniat-green flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  ) : (
                    <Check className="h-3.5 w-3.5 text-white" />
                  )}
                </div>
              ) : (
                <div
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    isSelectable ? 'border-green-500 group-hover:border-green-700' : 'border-line',
                  )}
                >
                  <Circle className="h-0 w-0" />
                </div>
              )}
              <span className="text-[15px] font-medium">{item.option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
