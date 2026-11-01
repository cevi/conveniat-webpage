'use client';

import { Button } from '@/components/ui/buttons/button';
import { CHAT_DELETION_UNDO_MS } from '@/features/chat/hooks/use-pending-chat-deletion';
import type { Locale, StaticTranslationString } from '@/types/types';
import { motion, useReducedMotion } from 'framer-motion';
import { Trash2, Undo2 } from 'lucide-react';
import type React from 'react';

const chatDeletedText: StaticTranslationString = {
  de: 'Chat gelöscht',
  en: 'Chat deleted',
  fr: 'Chat supprimé',
};

const undoText: StaticTranslationString = {
  de: 'Rückgängig',
  en: 'Undo',
  fr: 'Annuler',
};

/**
 * Tells that a chat was deleted from the list and offers to take it back while the delete waits,
 * see `usePendingChatDeletion`. It takes the place of "Neuer Chat" above the tab bar; the line
 * along its bottom runs out with the time left, so give it the chat's id as `key` to restart it.
 */
export const ChatDeletedBanner: React.FC<{
  onUndo: () => void;
  locale: Locale;
}> = ({ onUndo, locale }) => {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <div
      role="status"
      className="bg-quiet border-line fixed inset-x-4 bottom-[calc(var(--app-tab-bar-height)+16px)] z-30 mx-auto flex h-[52px] max-w-md items-center gap-3 overflow-hidden rounded-[14px] border pr-1 pl-4 shadow-lg"
    >
      <Trash2 className="h-5 w-5 shrink-0 text-green-700" aria-hidden="true" />
      <span className="text-[15px] text-green-900">{chatDeletedText[locale]}</span>
      <Button variant="outlined" size="touch" className="ml-auto" onClick={onUndo}>
        <Undo2 aria-hidden="true" />
        {undoText[locale]}
      </Button>
      {!reduceMotion && (
        <motion.div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-green-400"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: CHAT_DELETION_UNDO_MS / 1000, ease: 'linear' }}
        />
      )}
    </div>
  );
};
