'use client';

import { AppFooterController } from '@/components/footer/hide-footer-context';
import type { ChatDetails as ChatDetailsData } from '@/features/chat/api/types';
import type React from 'react';
import { useMemo, useState } from 'react';

import { IconTile } from '@/components/ui/icon-tile';
import { PersonAvatar } from '@/components/ui/person-avatar';
import type { Contact } from '@/features/chat/api/queries/list-contacts';
import { DeleteChat } from '@/features/chat/components/chat-details-view/delete-chat';
import { LeaveChat } from '@/features/chat/components/chat-details-view/leave-chat';
import { AddParticipants } from '@/features/chat/components/chat-details-view/sections/add-participants';
import { ChatCapabilities } from '@/features/chat/components/chat-details-view/sections/chat-capabilities';
import { ChatCourseSection } from '@/features/chat/components/chat-details-view/sections/chat-course-section';
import { ChatDetailsHeader } from '@/features/chat/components/chat-details-view/sections/chat-details-header';
import { ChatNameSection } from '@/features/chat/components/chat-details-view/sections/chat-name-section';
import { MemberActionsSheet } from '@/features/chat/components/chat-details-view/sections/member-actions-sheet';
import type { DetailsParticipant } from '@/features/chat/components/chat-details-view/sections/participants-list';
import { ParticipantsList } from '@/features/chat/components/chat-details-view/sections/participants-list';
import { ChatDetailsPageSkeleton } from '@/features/chat/components/chat-view/chat-details-skeleton';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useAddParticipants } from '@/features/chat/hooks/use-add-participants';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { useCreateChat } from '@/features/chat/hooks/use-create-chat';
import { useRemoveParticipants } from '@/features/chat/hooks/use-remove-participant';
import { useUpdateChatMutation } from '@/features/chat/hooks/use-update-chat-mutation';
import {
  describeContactFunktionen,
  describeContactHof,
  matchesContactSearch,
} from '@/features/chat/utils/contact-search';
import { splitDisplayName } from '@/features/chat/utils/split-display-name';
import { isChatArchived } from '@/lib/chat-shared';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma/client';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Megaphone, Siren, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useCurrentLocale } from '@/hooks/use-current-locale';

/** The function and Hof lines of a participant; empty for someone not among the contacts. */
const participantLines = (
  contact: Contact | undefined,
): { funktionLine: string; hofLine: string } =>
  contact === undefined
    ? { funktionLine: '', hofLine: '' }
    : { funktionLine: describeContactFunktionen(contact), hofLine: describeContactHof(contact) };

const addFailedText: StaticTranslationString = {
  de: 'Die ausgewählten Personen konnten nicht hinzugefügt werden.',
  en: 'The selected people could not be added.',
  fr: "Les personnes sélectionnées n'ont pas pu être ajoutées.",
};

const chatTypeText: Record<string, StaticTranslationString | undefined> = {
  GROUP: { de: 'Gruppe', en: 'Group', fr: 'Groupe' },
  ONE_TO_ONE: { de: 'Privater Chat', en: 'Private chat', fr: 'Chat privé' },
  COURSE_GROUP: { de: 'Workshop-Chat', en: 'Workshop chat', fr: "Chat d'atelier" },
  SUPPORT_GROUP: { de: 'Support', en: 'Support', fr: 'Support' },
  EMERGENCY: { de: 'Notfall', en: 'Emergency', fr: 'Urgence' },
  ANNOUNCEMENT: { de: 'Ankündigungen', en: 'Announcements', fr: 'Annonces' },
};

const createdByYouText: StaticTranslationString = {
  de: 'erstellt von dir',
  en: 'created by you',
  fr: 'créé par toi',
};

const createdByText: StaticTranslationString = {
  de: 'erstellt von {name}',
  en: 'created by {name}',
  fr: 'créé par {name}',
};

const createdOnText: StaticTranslationString = {
  de: 'am {date}',
  en: 'on {date}',
  fr: 'le {date}',
};

const createdText: StaticTranslationString = {
  de: 'erstellt am {date}',
  en: 'created on {date}',
  fr: 'créé le {date}',
};

const creationDateOptions: Intl.DateTimeFormatOptions = {
  timeZone: 'Europe/Zurich',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};

const creationDateFormats = {
  de: new Intl.DateTimeFormat('de-CH', creationDateOptions),
  en: new Intl.DateTimeFormat('en-US', creationDateOptions),
  fr: new Intl.DateTimeFormat('fr-CH', creationDateOptions),
} as const;

/** "21. Okt. 2026" on the camp's calendar; empty for a date a stale cache cannot give. */
const formatCreationDate = (createdAt: Date | string | undefined, locale: Locale): string => {
  if (createdAt === undefined) return '';
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? '' : creationDateFormats[locale].format(date);
};

const heroTileClassName = 'h-[72px] w-[72px] rounded-full [&_svg]:h-8 [&_svg]:w-8';

/** The big picture of the chat: the other person, or an icon for what kind of chat it is. */
const ChatHeroAvatar: React.FC<{ chat: ChatDetailsData; currentUser: string | undefined }> = ({
  chat,
  currentUser,
}) => {
  if (chat.type === ChatType.ONE_TO_ONE) {
    const partner = chat.participants.find((participant) => participant.id !== currentUser);
    if (partner !== undefined) {
      return (
        <PersonAvatar
          seed={partner.id}
          name={partner.name}
          pictureUrl={partner.pictureUrl}
          className="h-[72px] w-[72px] text-2xl"
        />
      );
    }
  }
  if (chat.type === ChatType.ANNOUNCEMENT)
    return <IconTile icon={Megaphone} className={heroTileClassName} />;
  // red belongs to Notfall, and this is one
  if (chat.type === ChatType.EMERGENCY)
    return <IconTile icon={Siren} className={cn(heroTileClassName, 'bg-red-50 text-red-700')} />;
  return <IconTile icon={Users} className={heroTileClassName} />;
};

const isChatAdmin = (permission: string | undefined): boolean =>
  permission === ChatMembershipPermission.OWNER || permission === ChatMembershipPermission.ADMIN;

export const ChatDetails: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const chatId = useChatId();
  const router = useRouter();
  const { data: chatDetails, isLoading } = useChatDetail(chatId);

  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [memberInSheet, setMemberInSheet] = useState<DetailsParticipant | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactsToAdd, setSelectedContactsToAdd] = useState<Contact[]>([]);
  const { data: allContacts, isLoading: isLoadingContacts } = trpc.chat.contacts.useQuery({});
  const updateChatMutation = useUpdateChatMutation();
  const addParticipantsMutation = useAddParticipants();
  const removeParticipantMutation = useRemoveParticipants();
  const { data: currentUser } = trpc.chat.user.useQuery({});
  const { data: maxGroupMembers } = trpc.chat.getGroupMemberLimit.useQuery();
  const { createChat } = useCreateChat();
  const trpcUtils = trpc.useUtils();

  const isGroupChat = (chatDetails?.participants.length ?? 0) > 2;
  const isAnnouncement = chatDetails?.type === ChatType.ANNOUNCEMENT;
  const isCourseGroup = chatDetails?.type === ChatType.COURSE_GROUP;

  // Memoize the list of contacts that can be added (not already in the chat)
  const addableContacts = useMemo(() => {
    if (!allContacts || !chatDetails) return [];
    const participantIds = new Set(chatDetails.participants.map((p) => p.id));
    return allContacts.filter(
      (contact) =>
        !participantIds.has(contact.userId) && matchesContactSearch(contact, searchQuery),
    );
  }, [allContacts, chatDetails, searchQuery]);

  // The participants come without their Hof and functions; the contacts, already loaded for
  // adding people, carry them. Your own row stays without, the contacts leave you out.
  const contactById = useMemo(
    () => new Map((allContacts ?? []).map((contact) => [contact.userId, contact])),
    [allContacts],
  );

  if (isLoading || chatDetails === undefined) {
    return <ChatDetailsPageSkeleton />;
  }

  const currentUserMembership = chatDetails.participants.find((p) => p.id === currentUser);
  const isAdmin = isChatAdmin(currentUserMembership?.chatPermission);
  const isGroup = chatDetails.type === ChatType.GROUP;
  // mirrors the checks in `leaveChat`
  const canLeave = isGroup && !isChatArchived(chatDetails);
  // mirrors `addParticipants` and `removeParticipant`: a group's admins, and never its owner
  const canManage = isGroup && isAdmin && !isChatArchived(chatDetails);
  // mirrors the check in `addParticipants`: only groups created by participants are capped
  const openGroupSlots =
    isGroup && maxGroupMembers !== undefined
      ? Math.max(0, maxGroupMembers - chatDetails.participants.length)
      : undefined;
  const isAtGroupLimit =
    openGroupSlots !== undefined && selectedContactsToAdd.length >= openGroupSlots;

  let addError: string | undefined;
  if (addParticipantsMutation.error !== null) {
    // a refusal is written for the user, in their language; anything else is not
    addError =
      addParticipantsMutation.error.data?.code === 'BAD_REQUEST'
        ? addParticipantsMutation.error.message
        : addFailedText[locale];
  }

  const owner = chatDetails.participants.find(
    (p) => p.chatPermission === ChatMembershipPermission.OWNER,
  );
  let meta = chatTypeText[chatDetails.type]?.[locale] ?? '';
  const createdOn = formatCreationDate(chatDetails.createdAt, locale);
  if (isGroup && owner !== undefined) {
    const createdBy =
      owner.id === currentUser
        ? createdByYouText[locale]
        : createdByText[locale].replace('{name}', splitDisplayName(owner.name).primary);
    meta =
      createdOn === ''
        ? `${meta} · ${createdBy}`
        : `${meta} · ${createdBy} ${createdOnText[locale].replace('{date}', createdOn)}`;
  } else if (createdOn !== '') {
    meta = `${meta} · ${createdText[locale].replace('{date}', createdOn)}`;
  }

  const handleToggleContactSelection = (contact: Contact): void => {
    setSelectedContactsToAdd((previous) => {
      if (previous.some((c) => c.userId === contact.userId)) {
        return previous.filter((c) => c.userId !== contact.userId);
      }
      if (openGroupSlots !== undefined && previous.length >= openGroupSlots) return previous;
      return [...previous, contact];
    });
  };

  const handleAddParticipants = (): void => {
    if (selectedContactsToAdd.length === 0) return;
    addParticipantsMutation.mutate(
      {
        chatId: chatDetails.id,
        participantIds: selectedContactsToAdd.map((c) => c.userId),
      },
      // the added people are members now and would otherwise still count against the limit
      {
        onSuccess: () => {
          setSelectedContactsToAdd([]);
          setSearchQuery('');
          setIsAddSheetOpen(false);
        },
      },
    );
  };

  /** Opens the private chat with someone, or starts it; needs them among the contacts. */
  const messageAction = (participantId: string): (() => void) | undefined => {
    const contact = contactById.get(participantId);
    if (contact === undefined) return undefined;
    return (): void => {
      const existing = trpcUtils.chat.chats
        .getData({})
        ?.find(
          (chat) =>
            chat.chatType === ChatType.ONE_TO_ONE &&
            chat.partner?.userId === participantId &&
            chat.isArchived !== true,
        );
      router.push(
        `/app/chat/${existing?.id ?? createChat({ chatName: undefined, members: [contact] })}`,
      );
    };
  };

  const canRemove = (participant: DetailsParticipant): boolean =>
    canManage && participant.chatPermission !== ChatMembershipPermission.OWNER;

  const participants: DetailsParticipant[] = chatDetails.participants.map((participant) => ({
    ...participant,
    ...participantLines(contactById.get(participant.id)),
  }));

  return (
    <div className="bg-page fixed top-(--preview-banner-height) z-[110] flex h-[calc(100dvh-var(--preview-banner-height))] w-screen flex-col overflow-y-hidden xl:top-(--app-content-top) xl:left-(--app-content-left) xl:z-0 xl:h-[calc(100dvh-var(--app-content-top))] xl:w-[calc(100dvw-var(--app-content-left))]">
      <AppFooterController hideAppFooter />

      <ChatDetailsHeader chatId={chatId} locale={locale} />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-10">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <ChatNameSection
            avatar={<ChatHeroAvatar chat={chatDetails} currentUser={currentUser} />}
            currentName={chatDetails.name}
            meta={meta}
            description={chatDetails.description}
            canRename={isGroupChat}
            isSaving={updateChatMutation.isPending}
            locale={locale}
            onSaveName={(newName) => {
              updateChatMutation.mutate({ chatUuid: chatDetails.id, newName });
            }}
          />

          {isCourseGroup &&
            chatDetails.courseId !== null &&
            chatDetails.courseId !== undefined &&
            chatDetails.courseId !== '' && (
              <ChatCourseSection courseId={chatDetails.courseId} locale={locale} />
            )}

          {!isAnnouncement && (
            <ParticipantsList
              participants={participants}
              currentUser={currentUser}
              onAdd={canManage ? (): void => setIsAddSheetOpen(true) : undefined}
              actionFor={(participant) => {
                if (canRemove(participant)) {
                  return { kind: 'menu', run: () => setMemberInSheet(participant) };
                }
                const sendMessage = messageAction(participant.id);
                return sendMessage === undefined
                  ? undefined
                  : { kind: 'message', run: sendMessage };
              }}
              locale={locale}
            />
          )}

          <ChatCapabilities
            capabilities={chatDetails.capabilities}
            chatPermission={currentUserMembership?.chatPermission}
            isAnnouncement={isAnnouncement}
            locale={locale}
          />

          {(canLeave || !isAnnouncement) && (
            <div className="border-line divide-line divide-y overflow-hidden rounded-[14px] border bg-white">
              {canLeave && <LeaveChat />}
              {!isAnnouncement && <DeleteChat />}
            </div>
          )}
        </div>
      </div>

      {canManage && (
        <AddParticipants
          open={isAddSheetOpen}
          onOpenChange={setIsAddSheetOpen}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedContacts={selectedContactsToAdd}
          addableContacts={addableContacts}
          onToggleSelection={handleToggleContactSelection}
          onAddParticipants={handleAddParticipants}
          isLoadingContacts={isLoadingContacts}
          isAdding={addParticipantsMutation.isPending}
          addError={addError}
          isAtGroupLimit={isAtGroupLimit}
          maxGroupMembers={maxGroupMembers}
          locale={locale}
        />
      )}

      <MemberActionsSheet
        participant={memberInSheet}
        onClose={() => {
          setMemberInSheet(undefined);
          removeParticipantMutation.reset();
        }}
        onSendMessage={memberInSheet === undefined ? undefined : messageAction(memberInSheet.id)}
        onRemove={
          memberInSheet !== undefined && canRemove(memberInSheet)
            ? (onDone): void =>
                removeParticipantMutation.mutate(
                  { chatId: chatDetails.id, participantId: memberInSheet.id },
                  { onSuccess: onDone },
                )
            : undefined
        }
        isRemoving={removeParticipantMutation.isPending}
        hasRemoveFailed={removeParticipantMutation.isError}
        locale={locale}
      />
    </div>
  );
};
