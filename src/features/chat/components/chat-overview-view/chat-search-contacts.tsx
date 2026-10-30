'use client';

import { SectionLabel } from '@/components/ui/section-label';
import {
  contactListName,
  ContactRowContent,
  contactRowItemClassName,
  ContactRowsSkeleton,
} from '@/features/chat/components/chat-overview-view/contact-row';
import {
  openChatFailedText,
  useOpenChatWithContact,
} from '@/features/chat/hooks/use-open-chat-with-contact';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { matchesContactSearch } from '@/features/chat/utils/contact-search';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Loader2, MessageSquare, MessageSquarePlus } from 'lucide-react';
import type React from 'react';
import { useId } from 'react';

const noChatsForText: StaticTranslationString = {
  de: 'Keine Chats für «{query}»',
  en: 'No chats for “{query}”',
  fr: 'Aucun chat pour « {query} »',
};

const startNewChatText: StaticTranslationString = {
  de: 'Neuen Chat starten',
  en: 'Start a new chat',
  fr: 'Démarrer un nouveau chat',
};

/**
 * The foot of a search over the chats: the contacts that match it, each a tap away from a chat
 * with them, as in other chat apps. Under the chats found it leaves out the people those chats
 * are with; without any, it says so first. Renders `fallback` when no contact matches or the
 * contacts cannot be loaded, as offline without a cached address book.
 */
export const ChatSearchContacts: React.FC<{
  searchQuery: string;
  /** the chats found, listed above; without any, the contacts head the result */
  foundChats: ChatWithMessagePreview[];
  fallback?: React.ReactNode;
  locale: Locale;
}> = ({ searchQuery, foundChats, fallback, locale }) => {
  const { data: contacts, isLoading } = trpc.chat.contacts.useQuery({});
  // `push`: going back from the chat returns to the list, its search cleared by then
  const { openChatWith, openingUserId, hasOpenFailed } = useOpenChatWithContact('push');
  const labelId = useId();

  // an empty query matches every contact
  if (searchQuery.trim() === '') return fallback;

  const hasFoundChats = foundChats.length > 0;
  // whoever has a one-to-one chat in the list above is found already
  const partnersFound = new Set(foundChats.map((chat) => chat.partner?.userId));
  const matches = (contacts ?? [])
    .filter(
      (contact) => !partnersFound.has(contact.userId) && matchesContactSearch(contact, searchQuery),
    )
    .sort((a, b) => contactListName(a).localeCompare(contactListName(b), locale));
  // under chats found, the contacts join once they are there, without a skeleton jumping away
  if ((hasFoundChats || !isLoading) && matches.length === 0) return fallback;

  return (
    <div
      className={cn(
        '-mx-4 bg-white sm:mx-0',
        hasFoundChats ? 'border-quiet border-t-8' : 'border-line border-t',
      )}
    >
      {!hasFoundChats && (
        <p className="bg-quiet flex min-h-10 items-center gap-2 px-4 py-2 text-[13px] text-green-700">
          <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
          {noChatsForText[locale].replace('{query}', searchQuery.trim())}
        </p>
      )}

      {hasOpenFailed && (
        <p
          role="alert"
          className="text-danger-text bg-danger-soft mx-4 mt-4 rounded-xl px-4 py-3 text-sm"
        >
          {openChatFailedText[locale]}
        </p>
      )}

      <section aria-labelledby={labelId} className="pt-4 pb-8">
        <SectionLabel className="px-4">
          <span id={labelId}>{startNewChatText[locale]}</span>
        </SectionLabel>
        <div className="pt-2">
          {matches.length === 0 ? (
            <ContactRowsSkeleton count={2} />
          ) : (
            <ul>
              {matches.map((contact) => (
                <li key={contact.userId} className={contactRowItemClassName}>
                  <button
                    type="button"
                    onClick={() => openChatWith(contact)}
                    aria-busy={openingUserId === contact.userId}
                    // one chat opens at a time; the row that opens shows a spinner and stays still
                    disabled={openingUserId !== undefined && openingUserId !== contact.userId}
                    className="hover:bg-quiet focus-visible:focus-ring-inset flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left disabled:cursor-default"
                  >
                    <ContactRowContent contact={contact} />
                    {openingUserId === contact.userId ? (
                      <Loader2
                        className="h-5 w-5 shrink-0 animate-spin text-green-500"
                        aria-hidden="true"
                      />
                    ) : (
                      <MessageSquarePlus
                        className="text-conveniat-green h-5 w-5 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};
