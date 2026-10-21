'use client';
import { AppFooterController } from '@/components/footer/hide-footer-context';
import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { SectionLabel } from '@/components/ui/section-label';
import type { Contact } from '@/features/chat/api/queries/list-contacts';
import { ChatSearchField } from '@/features/chat/components/ui/chat-search-field';
import { useCreateChat } from '@/features/chat/hooks/use-create-chat';
import {
  describeContactFunktionen,
  describeContactHof,
  matchesContactSearch,
} from '@/features/chat/utils/contact-search';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { getContactDisplayName, getContactShortName } from '@/utils/format-user-name';
import { cn } from '@/utils/tailwindcss-override';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Loader2, Plus, Users, X } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

const groupNamePlaceholder: StaticTranslationString = {
  de: 'Gruppennamen eingeben (erforderlich)',
  en: 'Enter group name (required)',
  fr: 'Entrez le nom du groupe (obligatoire)',
};

const searchContactsPlaceholder: StaticTranslationString = {
  de: 'Kontakte suchen...',
  en: 'Search contacts...',
  fr: 'Rechercher des contacts...',
};

const creatingText: StaticTranslationString = {
  en: 'Creating...',
  de: 'Erstelle...',
  fr: 'Création en cours...',
};

const createText: StaticTranslationString = {
  en: 'Create',
  de: 'Erstellen',
  fr: 'Créer',
};

const newChat: StaticTranslationString = {
  en: 'New Chat',
  de: 'Neuer Chat',
  fr: 'Nouveau chat',
};

const selectContactsText: StaticTranslationString = {
  en: 'Select Contacts',
  de: 'Kontakte auswählen',
  fr: 'Sélectionner des contacts',
};

const loadingContactsText: StaticTranslationString = {
  en: 'Loading contacts...',
  de: 'Lade Kontakte...',
  fr: 'Chargement des contacts...',
};

const groupMinMaxLength: StaticTranslationString = {
  en: 'Group name must be between 2-50 characters',
  de: 'Gruppenname muss zwischen 2 und 50 Zeichen liegen',
  fr: 'Le nom du groupe doit comporter entre 2 et 50 caractères',
};

const noContactsAvailableText: StaticTranslationString = {
  de: 'Keine Kontakte verfügbar',
  en: 'No contacts available',
  fr: 'Aucun contact disponible',
};

const noContactsAvailableDescriptionText: StaticTranslationString = {
  de: 'Du hast aktuell noch keine Kontakte in deiner Liste. Lade neue Mitglieder ein oder scanne einen QR-Code.',
  en: 'You currently have no contacts in your list. Invite new members or scan a QR code.',
  fr: "Vous n'avez actuellement aucun contact dans votre liste. Invitez de nouveaux membres ou scannez un code QR.",
};

const noContactsFoundText: StaticTranslationString = {
  de: 'Keine Kontakte für deine Suche gefunden',
  en: 'No contacts found matching your search',
  fr: 'Aucun contact trouvé pour votre recherche',
};

const selectedCountText: StaticTranslationString = {
  de: 'Ausgewählt',
  en: 'Selected',
  fr: 'Sélectionné',
};

const groupLimitReachedText: StaticTranslationString = {
  de: 'Eine Gruppe hat höchstens {max} Mitglieder, dich eingeschlossen.',
  en: 'A group can have at most {max} members, including you.',
  fr: 'Un groupe compte au plus {max} membres, toi compris.',
};

const groupChatNameLabel: StaticTranslationString = {
  de: 'Gruppen-Name',
  en: 'Group Chat Name',
  fr: 'Nom du groupe',
};

const groupNameRequiredText: StaticTranslationString = {
  de: 'Ein Gruppenchat braucht einen Namen',
  en: 'A group chat needs a name',
  fr: 'Un groupe a besoin d’un nom',
};

const removeContactLabel: StaticTranslationString = {
  de: '{name} entfernen',
  en: 'Remove {name}',
  fr: 'Retirer {name}',
};

const backLabel: StaticTranslationString = {
  de: 'Zurück zu den Chats',
  en: 'Back to chats',
  fr: 'Retour aux discussions',
};

export const CreateNewChatPage: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { data: allContacts, isLoading } = trpc.chat.contacts.useQuery({});
  const { data: maxGroupMembers } = trpc.chat.getGroupMemberLimit.useQuery();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [groupChatName, setGroupChatName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [groupChatNameError, setGroupChatNameError] = useState('');

  const { createChat } = useCreateChat();

  const resetForm = useCallback((): void => {
    setSelectedContacts([]);
    setGroupChatName('');
    setGroupChatNameError('');
    setSearchQuery('');
    setIsCreating(false);
  }, []);

  // The draft belongs to *this* visit of /app/chat/new. Leaving the screen - by creating
  // the chat, by going back or by any other navigation - discards it, so coming back here
  // always starts from an empty selection instead of resurrecting the abandoned draft.
  const isOnCreateChatRoute = /\/app\/chat\/new\/?$/.test(pathname);
  useEffect(() => {
    if (isOnCreateChatRoute) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetForm();
  }, [isOnCreateChatRoute, resetForm]);

  const isGroupChat = selectedContacts.length > 1;
  // the creator is a member too
  const isAtGroupLimit =
    maxGroupMembers !== undefined && selectedContacts.length + 1 >= maxGroupMembers;

  const filteredContacts = allContacts?.filter((contact) =>
    matchesContactSearch(contact, searchQuery),
  );

  const validateGroupName = (name: string): string => {
    if (isGroupChat && name.trim().length === 0) {
      return groupNameRequiredText[locale];
    }
    if (name.trim().length > 0 && (name.trim().length < 2 || name.trim().length > 50)) {
      return groupMinMaxLength[locale];
    }
    return '';
  };

  const isFormValid =
    selectedContacts.length > 0 &&
    (!isGroupChat || (groupChatName.trim().length >= 2 && groupChatName.trim().length <= 50));

  const handleContactToggle = (contact: Contact): void => {
    setSelectedContacts((previous) => {
      const isSelected = previous.some((c) => c.userId === contact.userId);
      if (isSelected) return previous.filter((c) => c.userId !== contact.userId);
      if (maxGroupMembers !== undefined && previous.length + 1 >= maxGroupMembers) return previous;
      return [...previous, contact];
    });
    // the search found this contact; the next one is most likely someone else
    const isAdded =
      !selectedContacts.some((c) => c.userId === contact.userId) &&
      (maxGroupMembers === undefined || selectedContacts.length + 1 < maxGroupMembers);
    if (isAdded) setSearchQuery('');
  };

  const handleCreateChat = (): void => {
    if (selectedContacts.length === 0 || isCreating) {
      return;
    }

    const nameError = validateGroupName(groupChatName);
    if (nameError !== '') {
      setGroupChatNameError(nameError);
      return;
    }

    try {
      setIsCreating(true);
      const chatName: string | undefined =
        selectedContacts.length > 1 && groupChatName.trim() !== ''
          ? groupChatName.trim()
          : undefined;

      // The id is chosen client-side, so the chat can be opened straight away - the
      // creation may still be in flight, or queued in the outbox while offline.
      const chatId = createChat({ chatName, members: selectedContacts });

      resetForm();
      // `replace`, not `push`: going back from the new chat belongs to the overview, not
      // to the form that created it.
      router.replace(`/app/chat/${chatId}`);
    } catch (error) {
      console.error(error);
      setIsCreating(false);
    }
  };

  const handleGroupNameChange = (value: string): void => {
    setGroupChatName(value);
    // Clear error when user starts typing
    if (groupChatNameError !== '') {
      setGroupChatNameError('');
    }
    // Validate on change for real-time feedback
    const error = validateGroupName(value);
    setGroupChatNameError(error);
  };

  const unselectedContacts = filteredContacts?.filter(
    (contact) => !selectedContacts.some((selected) => selected.userId === contact.userId),
  );

  const hasContacts = (allContacts?.length ?? 0) > 0;

  return (
    <div className="bg-page fixed top-(--preview-banner-height) z-[110] flex h-[calc(100dvh-var(--preview-banner-height))] w-screen flex-col overflow-y-hidden xl:top-(--app-content-top) xl:left-(--app-content-left) xl:z-0 xl:h-[calc(100dvh-var(--app-content-top))] xl:w-[calc(100dvw-var(--app-content-left))]">
      <AppFooterController hideAppFooter />

      <div className="border-line flex h-[60px] shrink-0 items-center gap-1 border-b bg-white pr-3 pl-1">
        <Link
          href="/app/chat"
          aria-label={backLabel[locale]}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-green-900"
        >
          <ArrowLeft className="h-[22px] w-[22px]" aria-hidden="true" />
        </Link>
        <h1 className="font-heading text-heading min-w-0 flex-1 truncate text-xl font-extrabold">
          {newChat[locale]}
        </h1>
        <Button
          variant="primary"
          size="touch"
          onClick={handleCreateChat}
          disabled={!isFormValid || isCreating}
        >
          {isCreating
            ? creatingText[locale]
            : `${createText[locale]}${selectedContacts.length > 0 ? ` (${selectedContacts.length})` : ''}`}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-8">
        <div className="mx-auto flex max-w-xl flex-col gap-5">
          <AnimatePresence initial={false}>
            {isGroupChat && (
              <motion.div
                key="group-chat-name-input"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-2">
                  <SectionLabel>
                    {groupChatNameLabel[locale]} <span aria-hidden="true">*</span>
                  </SectionLabel>
                  <Input
                    placeholder={groupNamePlaceholder[locale]}
                    value={groupChatName}
                    onChange={(changeEvent) => handleGroupNameChange(changeEvent.target.value)}
                    aria-label={groupChatNameLabel[locale]}
                    aria-invalid={groupChatNameError !== ''}
                    className={cn(
                      'border-line h-11 rounded-xl border bg-white px-4 text-[15px] text-green-900 shadow-none placeholder:text-green-500',
                      'focus-visible:border-conveniat-green focus-visible:ring-0',
                      groupChatNameError !== '' && 'border-green-900',
                    )}
                    required
                  />
                  <span
                    aria-live="polite"
                    className={cn(
                      'text-[13px]',
                      groupChatNameError === '' ? 'text-green-500' : 'font-semibold text-green-900',
                    )}
                  >
                    {groupChatNameError === '' ? groupMinMaxLength[locale] : groupChatNameError}
                  </span>
                </div>
              </motion.div>
            )}

            {selectedContacts.length > 0 && (
              <motion.section
                key="selected-contacts-pills"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <SectionLabel>
                  {selectedCountText[locale]} ({selectedContacts.length})
                </SectionLabel>
                <ul className="-mx-1 mt-2 flex scrollbar-none gap-1 overflow-x-auto pb-1">
                  {selectedContacts.map((contact) => (
                    <li key={contact.userId} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => handleContactToggle(contact)}
                        aria-label={removeContactLabel[locale].replace(
                          '{name}',
                          getContactDisplayName(contact),
                        )}
                        className="flex w-[72px] cursor-pointer flex-col items-center gap-1 rounded-xl px-1 py-1"
                      >
                        <span className="relative">
                          <PersonAvatar
                            seed={contact.userId}
                            name={contact.name}
                            pictureUrl={contact.pictureUrl}
                            className="h-12 w-12 text-sm"
                          />
                          <span className="bg-heading absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full text-white ring-2 ring-white">
                            <X className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                          </span>
                        </span>
                        <span className="max-w-full truncate text-xs font-semibold text-green-900">
                          {getContactShortName(contact)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.section>
            )}
          </AnimatePresence>

          <section className="flex flex-col gap-3">
            {hasContacts && (
              <ChatSearchField
                placeholder={searchContactsPlaceholder[locale]}
                value={searchQuery}
                onChange={setSearchQuery}
              />
            )}

            <div>
              <SectionLabel>{selectContactsText[locale]}</SectionLabel>
              {isAtGroupLimit && (
                <p className="mt-1 text-[13px] text-green-700">
                  {groupLimitReachedText[locale].replace('{max}', String(maxGroupMembers))}
                </p>
              )}
            </div>

            {isLoading && (
              <div
                className="flex items-center justify-center gap-3 py-12 text-[15px] text-green-700"
                role="status"
              >
                <Loader2 className="h-5 w-5 animate-spin text-green-500" aria-hidden="true" />
                {loadingContactsText[locale]}
              </div>
            )}

            {!isLoading && unselectedContacts?.length === 0 && (
              <EmptyState
                icon={Users}
                title={
                  searchQuery === '' ? noContactsAvailableText[locale] : noContactsFoundText[locale]
                }
                description={
                  searchQuery === '' ? noContactsAvailableDescriptionText[locale] : undefined
                }
              />
            )}

            {!isLoading && (unselectedContacts?.length ?? 0) > 0 && (
              <ul className="border-line divide-line divide-y overflow-hidden rounded-[14px] border bg-white">
                {unselectedContacts?.map((contact) => (
                  <li key={contact.userId}>
                    <button
                      type="button"
                      disabled={isAtGroupLimit}
                      onClick={() => handleContactToggle(contact)}
                      className="hover:bg-page flex min-h-[64px] w-full cursor-pointer items-center gap-3 px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <PersonAvatar
                        seed={contact.userId}
                        name={contact.name}
                        pictureUrl={contact.pictureUrl}
                        className="h-11 w-11 text-sm"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] leading-5 font-semibold text-green-900">
                          {getContactDisplayName(contact)}
                        </span>
                        {contact.description && (
                          <span className="mt-0.5 block text-[13px] text-green-700">
                            {contact.description}
                          </span>
                        )}
                        {describeContactFunktionen(contact) !== '' && (
                          <span className="text-conveniat-green mt-0.5 block text-[13px] font-semibold">
                            {describeContactFunktionen(contact)}
                          </span>
                        )}
                        {describeContactHof(contact) !== '' && (
                          <span className="mt-0.5 block text-[13px] text-green-700">
                            {describeContactHof(contact)}
                          </span>
                        )}
                      </span>
                      <Plus className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
