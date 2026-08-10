'use client';
import { AppFooterController } from '@/components/footer/hide-footer-context';
import { AppSearchBar } from '@/components/ui/app-search-bar';
import { Button } from '@/components/ui/buttons/button';
import { Input } from '@/components/ui/input';
import type { Contact } from '@/features/chat/api/queries/list-contacts';
import { useCreateChat } from '@/features/chat/hooks/use-create-chat';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { getContactDisplayName, getContactShortName } from '@/utils/format-user-name';
import { cn } from '@/utils/tailwindcss-override';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Users, X } from 'lucide-react';
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

const groupChatNameLabel: StaticTranslationString = {
  de: 'Gruppen-Name',
  en: 'Group Chat Name',
  fr: 'Nom du groupe',
};

export const CreateNewChatPage: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { data: allContacts, isLoading } = trpc.chat.contacts.useQuery({});
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

  const filteredContacts = allContacts?.filter((contact) => {
    const query = searchQuery.toLowerCase().trim();
    if (query === '') return true;
    const matchesName = contact.name.toLowerCase().includes(query);
    const matchesNickname =
      typeof contact.nickname === 'string' && contact.nickname.trim().length > 0
        ? contact.nickname.toLowerCase().includes(query)
        : false;
    const matchesDescription =
      typeof contact.description === 'string' && contact.description.trim().length > 0
        ? contact.description.toLowerCase().includes(query)
        : false;
    return matchesName || matchesNickname || matchesDescription;
  });

  const validateGroupName = (name: string): string => {
    if (isGroupChat && name.trim().length === 0) {
      return 'Group name is required for group chats';
    }
    if (name.trim().length > 0 && name.trim().length < 2) {
      return 'Group name must be at least 2 characters';
    }
    if (name.trim().length > 50) {
      return 'Group name must be less than 50 characters';
    }
    return '';
  };

  const isFormValid =
    selectedContacts.length > 0 &&
    (!isGroupChat || (groupChatName.trim().length >= 2 && groupChatName.trim().length <= 50));

  const handleContactToggle = (contact: Contact): void => {
    setSelectedContacts((previous) => {
      const isSelected = previous.some((c) => c.userId === contact.userId);
      return isSelected
        ? previous.filter((c) => c.userId !== contact.userId)
        : [...previous, contact];
    });
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
    <div className="fixed top-0 z-[110] flex h-dvh w-screen flex-col overflow-y-hidden bg-gray-50/50 xl:top-[62px] xl:left-[480px] xl:z-0 xl:h-[calc(100dvh-62px)] xl:w-[calc(100dvw-480px)]">
      <AppFooterController hideAppFooter />

      {/* Modern Header */}
      <div className="flex h-16 items-center justify-between border-b border-gray-100 bg-white/95 px-4 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/app/chat">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="font-heading text-lg font-bold tracking-tight text-gray-900">
            {newChat[locale]}
          </h1>
        </div>

        <div>
          <Button
            onClick={handleCreateChat}
            disabled={!isFormValid || isCreating}
            className={cn(
              'font-heading rounded-xl px-5 py-2 text-sm font-semibold shadow-xs transition-all',
              isFormValid && !isCreating
                ? 'bg-conveniat-green text-white hover:bg-green-600 hover:shadow-md'
                : 'border border-gray-200 bg-gray-100 text-gray-400',
            )}
          >
            {isCreating
              ? creatingText[locale]
              : `${createText[locale]} ${selectedContacts.length > 0 ? `(${selectedContacts.length})` : ''}`}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-xl space-y-4">
          <AnimatePresence initial={false}>
            {/* Group Chat Name Input - App Aligned Input Styling */}
            {isGroupChat && (
              <motion.div
                key="group-chat-name-input"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="space-y-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-xs">
                  <div className="flex items-center gap-2">
                    <Users size={15} className="text-conveniat-green" />
                    <label className="font-heading text-xs font-semibold tracking-wider text-gray-700 uppercase">
                      {groupChatNameLabel[locale]} <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <Input
                    placeholder={groupNamePlaceholder[locale]}
                    value={groupChatName}
                    onChange={(changeEvent) => handleGroupNameChange(changeEvent.target.value)}
                    className={cn(
                      'font-body h-12 rounded-xl border border-gray-200 bg-gray-50/50 px-4 text-sm text-gray-900 transition-all placeholder:text-gray-400',
                      'focus:border-conveniat-green focus:ring-conveniat-green/20 focus:bg-white focus:ring-2 focus:outline-hidden',
                      groupChatNameError !== '' &&
                        'border-red-300 focus:border-red-500 focus:ring-red-500/20',
                    )}
                    required
                  />
                  {groupChatNameError !== '' && (
                    <p className="font-body text-xs text-red-600">{groupChatNameError}</p>
                  )}
                  <p className="font-body text-xs text-gray-400">{groupMinMaxLength[locale]}</p>
                </div>
              </motion.div>
            )}

            {/* Selected Contacts Horizontal Avatars Bar (WhatsApp / App Card Style) */}
            {selectedContacts.length > 0 && (
              <motion.div
                key="selected-contacts-pills"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden p-0.5"
              >
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
                  <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3">
                    <span className="font-heading text-xs font-semibold tracking-wider text-gray-500 uppercase">
                      {selectedCountText[locale]} ({selectedContacts.length})
                    </span>
                  </div>
                  <div className="flex scrollbar-none items-center gap-4 overflow-x-auto px-4 pt-3.5 pb-3">
                    {selectedContacts.map((contact) => (
                      <div
                        key={contact.userId}
                        className="group relative flex shrink-0 flex-col items-center gap-1.5 pt-1"
                      >
                        <div className="bg-conveniat-green font-heading relative flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white shadow-xs">
                          {getContactShortName(contact).charAt(0).toUpperCase()}
                          <button
                            type="button"
                            onClick={() => handleContactToggle(contact)}
                            className="absolute -top-1 -right-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white shadow-xs ring-2 ring-white transition-transform hover:scale-110 hover:bg-red-600"
                          >
                            <X size={12} className="stroke-[2.5]" />
                          </button>
                        </div>
                        <span className="font-body max-w-[68px] truncate text-center text-xs font-medium text-gray-800">
                          {getContactShortName(contact)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Contacts List Card with Search Bar Directly Attached */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
            {/* Search Input - Placed directly above the contact list */}
            {hasContacts && (
              <div className="border-b border-gray-100 bg-gray-50/50 p-3">
                <AppSearchBar
                  placeholder={searchContactsPlaceholder[locale]}
                  value={searchQuery}
                  onChange={(changeEvent) => setSearchQuery(changeEvent.target.value)}
                  onClear={() => setSearchQuery('')}
                />
              </div>
            )}

            <div className="border-b border-gray-100 px-5 py-3">
              <h2 className="font-heading text-xs font-semibold tracking-wider text-gray-500 uppercase">
                {selectContactsText[locale]}
              </h2>
            </div>

            <div className="min-h-[300px]">
              {isLoading && (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="border-t-conveniat-green h-7 w-7 animate-spin rounded-full border-2 border-gray-200"></div>
                    <p className="font-body text-sm text-gray-500">{loadingContactsText[locale]}</p>
                  </div>
                </div>
              )}

              {!isLoading && unselectedContacts?.length === 0 && (
                <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                  <div className="relative mb-4 flex items-center justify-center">
                    <div className="absolute -inset-2 rounded-full bg-linear-to-tr from-green-500/20 via-emerald-400/15 to-blue-500/20 blur-lg" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-md">
                      <Users className="text-conveniat-green h-8 w-8" />
                    </div>
                  </div>
                  <h3 className="font-heading text-base font-bold text-gray-900">
                    {searchQuery === ''
                      ? noContactsAvailableText[locale]
                      : noContactsFoundText[locale]}
                  </h3>
                  <p className="font-body mt-1 max-w-xs text-xs leading-relaxed text-balance text-gray-500">
                    {searchQuery === '' ? noContactsAvailableDescriptionText[locale] : ''}
                  </p>
                </div>
              )}

              {!isLoading && (unselectedContacts?.length ?? 0) > 0 && (
                <div className="divide-y divide-gray-50 p-2">
                  {unselectedContacts?.map((contact) => (
                    <div
                      key={contact.userId}
                      className="flex cursor-pointer items-center space-x-3 rounded-xl p-3 transition-all hover:bg-gray-50/80"
                      onClick={() => handleContactToggle(contact)}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-tr from-gray-100 to-gray-200 text-gray-600 transition-transform">
                        <span className="font-heading text-sm font-bold">
                          {contact.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-body text-sm font-medium text-gray-900">
                          {getContactDisplayName(contact)}
                        </p>
                        {contact.description && (
                          <p className="font-body text-xs text-gray-500">{contact.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
