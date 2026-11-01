'use client';

import type { Contact } from '@/features/chat/api/queries/list-contacts';
import { useCreateChat } from '@/features/chat/hooks/use-create-chat';
import type { StaticTranslationString } from '@/types/types';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

/** What a list says when {@link useOpenChatWithContact} could not open the chat. */
export const openChatFailedText: StaticTranslationString = {
  de: 'Chat konnte nicht geöffnet werden. Versuche es nochmals.',
  en: 'The chat could not be opened. Please try again.',
  fr: 'Le chat n’a pas pu être ouvert. Réessaie.',
};

/**
 * Opens the private chat with a contact, the one already there or a new one, from a list of
 * contacts. One chat opens at a time; the row of the contact being opened can show it until the
 * chat's route is reached, so the list is ready again when the user comes back to it.
 *
 * @param navigation - `replace` when the list is a step on the way to the chat that going
 * back should skip, `push` when going back should return to it
 */
export const useOpenChatWithContact = (
  navigation: 'push' | 'replace',
): {
  openChatWith: (contact: Contact) => void;
  /** the contact whose chat is opening */
  openingUserId: string | undefined;
  hasOpenFailed: boolean;
} => {
  const [openingUserId, setOpeningUserId] = useState<string | undefined>();
  const [hasOpenFailed, setHasOpenFailed] = useState(false);
  const router = useRouter();
  const { createChat } = useCreateChat();

  // The chat has opened once the route changed. Set while rendering, not in an effect: Next.js
  // keeps a route the user left mounted, hidden in an `<Activity>`, where effects do not run,
  // and a list whose row still spun when shown again ignored every tap.
  const pathname = usePathname();
  const [shownPathname, setShownPathname] = useState(pathname);
  if (pathname !== shownPathname) {
    setShownPathname(pathname);
    setOpeningUserId(undefined);
    setHasOpenFailed(false);
  }

  const openChatWith = (contact: Contact): void => {
    if (openingUserId !== undefined) return;
    setOpeningUserId(contact.userId);
    setHasOpenFailed(false);
    try {
      // The id is chosen client-side, so the chat opens straight away; for someone the user
      // already chats with, the server answers with that chat and the view follows it.
      const chatId = createChat({ chatName: undefined, members: [contact] });
      router[navigation](`/app/chat/${chatId}`);
    } catch (error) {
      console.error('Opening the chat failed', error);
      setOpeningUserId(undefined);
      setHasOpenFailed(true);
    }
  };

  return { openChatWith, openingUserId, hasOpenFailed };
};
