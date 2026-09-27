'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import { useFailedMessageActions } from '@/features/chat/hooks/use-failed-message-actions';
import type { Locale, StaticTranslationString } from '@/types/types';
import { AlertCircle } from 'lucide-react';
import type React from 'react';

const notSentText: StaticTranslationString = {
  de: 'Nicht gesendet',
  en: 'Not sent',
  fr: 'Non envoyé',
};

const retryText: StaticTranslationString = {
  de: 'Erneut senden',
  en: 'Retry',
  fr: 'Réessayer',
};

const deleteText: StaticTranslationString = {
  de: 'Löschen',
  en: 'Delete',
  fr: 'Supprimer',
};

/**
 * "Not sent · Retry · Delete" under a bubble whose send failed. Mounted only for failed
 * messages, so the list does not carry a send mutation per bubble.
 */
export const FailedMessageActions: React.FC<{ message: ChatMessage; locale: Locale }> = ({
  message,
  locale,
}) => {
  const { retry, discard } = useFailedMessageActions();

  return (
    <div className="font-body mt-1 flex items-center gap-1.5 pr-1 text-xs text-red-600">
      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{notSentText[locale]}</span>
      <span aria-hidden="true">·</span>
      <button
        type="button"
        className="cursor-pointer font-semibold underline-offset-2 hover:underline"
        onClick={(event) => {
          event.stopPropagation();
          retry(message);
        }}
      >
        {retryText[locale]}
      </button>
      <span aria-hidden="true">·</span>
      <button
        type="button"
        className="cursor-pointer text-gray-500 underline-offset-2 hover:underline"
        onClick={(event) => {
          event.stopPropagation();
          discard(message);
        }}
      >
        {deleteText[locale]}
      </button>
    </div>
  );
};
