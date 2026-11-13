import type { EditingMessage } from '@/features/chat/context/chat-actions-context';
import { useChatActions } from '@/features/chat/context/chat-actions-context';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useEditMessage } from '@/features/chat/hooks/use-edit-message';
import { CHAT_MESSAGE_MAX_LENGTH } from '@/features/chat/limits';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { chatErrorTexts } from '@/lib/chat-error-texts';
import type { Locale, StaticTranslationString } from '@/types/types';
import { userErrorMessage } from '@/utils/user-error-message';
import type React from 'react';
import { useEffect, useState } from 'react';

const editFailedText: StaticTranslationString = {
  de: 'Die Nachricht konnte nicht geändert werden. Bitte versuche es erneut.',
  en: 'The message could not be changed. Please try again.',
  fr: "Le message n'a pas pu être modifié. Veuillez réessayer.",
};

interface ComposerEdit {
  /** the message this composer is changing, or undefined while it writes a new one */
  editingMessage: EditingMessage | undefined;
  text: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  submitEdit: () => void;
  cancelEdit: () => void;
  /** online, not empty, not too long and not already saving */
  canSubmit: boolean;
  isOnline: boolean;
  /** why the server refused the change, in the user's language */
  editError: string | undefined;
}

/**
 * Focuses the field when editing starts, with the caret after the text, and fits its height to
 * the text it now holds, in edit mode and once it is back to the draft.
 */
const useEditFieldLayout = (
  textareaReference: React.RefObject<HTMLTextAreaElement | null>,
  editingMessageId: string | undefined,
  text: string,
  resizeTextarea: () => void,
): void => {
  useEffect(() => {
    resizeTextarea();
  }, [text, editingMessageId, resizeTextarea]);

  useEffect(() => {
    if (editingMessageId === undefined) return;
    const textarea = textareaReference.current;
    if (textarea === null) return;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [editingMessageId, textareaReference]);
};

/**
 * Edit mode of a composer: once "Bearbeiten" was chosen on a message of its conversation or
 * thread, the field holds that message's text instead of the draft, which stays untouched in
 * the meantime, and sending changes the message. The bubble changes at once; a refusal puts
 * it back and keeps the composer in edit mode with the reason. Editing needs the network.
 *
 * @param composerThreadId - the thread this composer writes in, fixed when it mounted, so the
 *   conversation's composer under an open thread does not take up an edit inside the thread
 */
export const useComposerEdit = ({
  composerThreadId,
  locale,
  textareaReference,
  resizeTextarea,
}: {
  composerThreadId: string | undefined;
  locale: Locale;
  textareaReference: React.RefObject<HTMLTextAreaElement | null>;
  resizeTextarea: () => void;
}): ComposerEdit => {
  const { editingMessage: anyEditingMessage, cancelEditing } = useChatActions();
  const chatId = useChatId();
  const isOnline = useOnlineStatus();
  const editMutation = useEditMessage({ chatId, parentId: composerThreadId });

  const editingMessage =
    anyEditingMessage !== undefined &&
    (anyEditingMessage.parentId ?? undefined) === composerThreadId
      ? anyEditingMessage
      : undefined;

  const [text, setText] = useState('');
  const [editError, setEditError] = useState<string>();
  // another message to edit starts from its own text; adjusted while rendering, so the field
  // never shows the previous one for a frame
  const [startedFor, setStartedFor] = useState<string>();
  if (editingMessage?.id !== startedFor) {
    setStartedFor(editingMessage?.id);
    setText(editingMessage?.text ?? '');
    setEditError(undefined);
  }

  useEditFieldLayout(textareaReference, editingMessage?.id, text, resizeTextarea);

  const trimmed = text.trim();
  const canSubmit =
    editingMessage !== undefined &&
    isOnline &&
    trimmed !== '' &&
    text.length <= CHAT_MESSAGE_MAX_LENGTH &&
    !editMutation.isPending;

  const submitEdit = (): void => {
    if (editingMessage === undefined || !canSubmit) return;
    // nothing changed: nothing to save, and no "Bearbeitet" for it
    if (trimmed === editingMessage.text.trim()) {
      cancelEditing();
      return;
    }
    setEditError(undefined);
    editMutation.mutate(
      { messageId: editingMessage.id, text: trimmed },
      {
        onSuccess: cancelEditing,
        onError: (error) =>
          setEditError(userErrorMessage(error, locale, chatErrorTexts, editFailedText)),
      },
    );
  };

  return {
    editingMessage,
    text,
    onChange: (event) => setText(event.target.value),
    submitEdit,
    cancelEdit: cancelEditing,
    canSubmit,
    isOnline,
    editError,
  };
};
