'use client';
import { EmptyState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { SectionLabel } from '@/components/ui/section-label';
import type { Contact } from '@/features/chat/api/queries/list-contacts';
import {
  contactListName,
  ContactRowContent,
  contactRowItemClassName,
  ContactRowsSkeleton,
  NewChatFrame,
} from '@/features/chat/components/chat-overview-view/contact-row';
import { newChatText } from '@/features/chat/components/chat-overview-view/create-chat-skeleton';
import type { ChatQrTab } from '@/features/chat/components/qr-component';
import { ChatQrSheet } from '@/features/chat/components/qr-component';
import { ChatSearchField } from '@/features/chat/components/ui/chat-search-field';
import { useCreateChat } from '@/features/chat/hooks/use-create-chat';
import { groupContactsByLetter, matchesContactSearch } from '@/features/chat/utils/contact-search';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Loader2, QrCode, UserPlus, Users } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type React from 'react';
import { useEffect, useState } from 'react';

const text = {
  search: {
    de: 'Name, Pfadiname oder Quartier',
    en: 'Name, Cevi name or Quartier',
    fr: 'Nom, nom Cevi ou Quartier',
  },
  newGroup: { de: 'Neue Gruppe', en: 'New group', fr: 'Nouveau groupe' },
  scanCode: { de: 'QR-Code scannen', en: 'Scan QR code', fr: 'Scanner un code QR' },
  loading: { de: 'Lade Kontakte …', en: 'Loading contacts …', fr: 'Chargement des contacts …' },
  noContacts: {
    de: 'Keine Kontakte verfügbar',
    en: 'No contacts available',
    fr: 'Aucun contact disponible',
  },
  noContactsDescription: {
    de: 'Du hast noch keine Kontakte. Scanne den QR-Code einer Person, um mit ihr zu chatten.',
    en: 'You have no contacts yet. Scan someone’s QR code to chat with them.',
    fr: 'Tu n’as pas encore de contacts. Scanne le code QR d’une personne pour discuter avec elle.',
  },
  openFailed: {
    de: 'Chat konnte nicht geöffnet werden. Versuche es nochmals.',
    en: 'The chat could not be opened. Please try again.',
    fr: 'Le chat n’a pas pu être ouvert. Réessaie.',
  },
  noMatch: {
    de: 'Keine Kontakte für deine Suche gefunden',
    en: 'No contacts found matching your search',
    fr: 'Aucun contact trouvé pour votre recherche',
  },
} satisfies Record<string, StaticTranslationString>;

/** An action at the head of the list: an icon tile and its label, 56px high. */
const actionRowClassName =
  'hover:bg-quiet flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-[15px] font-semibold text-green-900';

/**
 * Starting a chat: a new group, scanning someone's code, or one of the contacts, listed by
 * Ceviname under its letter. A tap on a contact opens the private chat with them, the one
 * already there or a new one.
 */
export const CreateNewChatPage: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { data: allContacts, isLoading } = trpc.chat.contacts.useQuery({});
  const [searchQuery, setSearchQuery] = useState('');
  const [openingUserId, setOpeningUserId] = useState<string | undefined>();
  const [hasOpenFailed, setHasOpenFailed] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [qrTab, setQrTab] = useState<ChatQrTab>('scan');
  const router = useRouter();
  const pathname = usePathname();
  const { createChat } = useCreateChat();

  // The route stays mounted, hidden, after leaving it; coming back starts from a clean screen.
  const isOnRoute = /\/app\/chat\/new\/?$/.test(pathname);
  useEffect(() => {
    if (isOnRoute) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchQuery('');
    // the chat has opened: nothing here stays busy for the next visit
    setOpeningUserId(undefined);
    setHasOpenFailed(false);
  }, [isOnRoute]);

  const openChatWith = (contact: Contact): void => {
    if (openingUserId !== undefined) return;
    setOpeningUserId(contact.userId);
    setHasOpenFailed(false);
    try {
      // The id is chosen client-side, so the chat opens straight away; for someone the user
      // already chats with, the server answers with that chat and the view follows it.
      const chatId = createChat({ chatName: undefined, members: [contact] });
      // `replace`: going back from the chat belongs to the list, not to this screen
      router.replace(`/app/chat/${chatId}`);
    } catch (error) {
      console.error('Opening the chat failed', error);
      setOpeningUserId(undefined);
      setHasOpenFailed(true);
    }
  };

  const openScanner = (): void => {
    setQrTab('scan');
    setIsQrOpen(true);
  };

  const filteredContacts =
    allContacts?.filter((contact) => matchesContactSearch(contact, searchQuery)) ?? [];
  const groups = groupContactsByLetter(filteredContacts, contactListName, locale);
  const hasContacts = (allContacts?.length ?? 0) > 0;
  const isSearching = searchQuery.trim() !== '';

  return (
    <NewChatFrame
      title={newChatText.title[locale]}
      backHref="/app/chat"
      backLabel={newChatText.back[locale]}
      onWhite
      head={
        // also while loading, so the field is in place before the contacts arrive
        hasContacts || isLoading ? (
          <ChatSearchField
            placeholder={text.search[locale]}
            value={searchQuery}
            onChange={setSearchQuery}
          />
        ) : undefined
      }
    >
      {!isSearching && (
        <ul className="border-quiet border-b-8 bg-white">
          <li>
            <Link href="/app/chat/new/group" className={actionRowClassName}>
              <IconTile icon={UserPlus} />
              {text.newGroup[locale]}
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={openScanner}
              aria-haspopup="dialog"
              className={actionRowClassName}
            >
              <IconTile icon={QrCode} />
              {text.scanCode[locale]}
            </button>
          </li>
        </ul>
      )}

      {hasOpenFailed && (
        <p
          role="alert"
          className="text-live-text bg-live-soft mx-4 mt-4 rounded-xl px-4 py-3 text-sm"
        >
          {text.openFailed[locale]}
        </p>
      )}

      {isLoading && (
        <div role="status" className="pt-4">
          <span className="sr-only">{text.loading[locale]}</span>
          <SectionLabel className="px-4">{newChatText.contacts[locale]}</SectionLabel>
          <div className="pt-2">
            <ContactRowsSkeleton />
          </div>
        </div>
      )}

      {!isLoading && filteredContacts.length === 0 && (
        <EmptyState
          icon={Users}
          title={isSearching ? text.noMatch[locale] : text.noContacts[locale]}
          description={isSearching ? undefined : text.noContactsDescription[locale]}
        />
      )}

      {!isLoading && filteredContacts.length > 0 && (
        <section aria-labelledby="new-chat-contacts" className="pt-4 pb-8">
          <SectionLabel className="px-4">
            <span id="new-chat-contacts">{newChatText.contacts[locale]}</span>
          </SectionLabel>
          {groups.map(({ letter, contacts }) => (
            <div key={letter ?? 'all'} className={letter === undefined ? 'pt-2' : undefined}>
              {letter !== undefined && (
                <h3 className="px-4 pt-3 pb-1 text-xs font-bold text-green-700">{letter}</h3>
              )}
              <ul>
                {contacts.map((contact) => (
                  <li key={contact.userId} className={contactRowItemClassName}>
                    <button
                      type="button"
                      onClick={() => openChatWith(contact)}
                      aria-busy={openingUserId === contact.userId}
                      // one chat opens at a time; the row that opens shows a spinner and stays still
                      disabled={openingUserId !== undefined && openingUserId !== contact.userId}
                      className="hover:bg-quiet flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left disabled:cursor-default"
                    >
                      <ContactRowContent contact={contact} />
                      {openingUserId === contact.userId && (
                        <Loader2
                          className="h-5 w-5 shrink-0 animate-spin text-green-500"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      <ChatQrSheet open={isQrOpen} onOpenChange={setIsQrOpen} tab={qrTab} onTabChange={setQrTab} />
    </NewChatFrame>
  );
};
