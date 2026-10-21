'use client';
import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import { fieldInputClassName, formFieldClassName } from '@/components/ui/field';
import { PersonAvatar } from '@/components/ui/person-avatar';
import type { Contact } from '@/features/chat/api/queries/list-contacts';
import {
  contactListName,
  ContactRowContent,
  contactRowItemClassName,
  ContactRowsSkeleton,
  NewChatFrame,
} from '@/features/chat/components/chat-overview-view/contact-row';
import { newChatText } from '@/features/chat/components/chat-overview-view/create-chat-skeleton';
import { ChatSearchField } from '@/features/chat/components/ui/chat-search-field';
import { useCreateChat } from '@/features/chat/hooks/use-create-chat';
import { matchesContactSearch } from '@/features/chat/utils/contact-search';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { getContactDisplayName, getContactShortName } from '@/utils/format-user-name';
import { cn } from '@/utils/tailwindcss-override';
import { Check, Users, X } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import { usePathname, useRouter } from 'next/navigation';
import type React from 'react';
import { useCallback, useEffect, useId, useState } from 'react';

/** The bounds `createChat` holds a group name to, see `verifyChatName`. */
const NAME_MIN = 2;
const NAME_MAX = 50;
/** A group has the creator and at least two others; with one it is a private chat. */
const MIN_SELECTED = 2;

const text = {
  nameLabel: { de: 'Gruppenname', en: 'Group name', fr: 'Nom du groupe' },
  namePlaceholder: { de: 'Name der Gruppe', en: 'Name of the group', fr: 'Nom du groupe' },
  nameRule: {
    de: `${NAME_MIN} bis ${NAME_MAX} Zeichen`,
    en: `${NAME_MIN} to ${NAME_MAX} characters`,
    fr: `${NAME_MIN} à ${NAME_MAX} caractères`,
  },
  search: { de: 'Kontakte hinzufügen', en: 'Add contacts', fr: 'Ajouter des contacts' },
  remove: { de: '{name} entfernen', en: 'Remove {name}', fr: 'Retirer {name}' },
  chosenPeople: { de: 'Ausgewählte Personen', en: 'Selected people', fr: 'Personnes choisies' },
  needPeople: {
    de: 'Wähle mindestens zwei Personen aus.',
    en: 'Choose at least two people.',
    fr: 'Choisis au moins deux personnes.',
  },
  needName: {
    de: 'Gib der Gruppe einen Namen, um sie zu erstellen.',
    en: 'Give the group a name to create it.',
    fr: 'Donne un nom au groupe pour le créer.',
  },
  limit: {
    de: 'Eine Gruppe hat höchstens {max} Mitglieder, dich eingeschlossen.',
    en: 'A group can have at most {max} members, including you.',
    fr: 'Un groupe compte au plus {max} membres, toi compris.',
  },
  create: { de: 'Gruppe erstellen', en: 'Create group', fr: 'Créer le groupe' },
  creating: { de: 'Erstelle …', en: 'Creating …', fr: 'Création …' },
  loading: { de: 'Lade Kontakte …', en: 'Loading contacts …', fr: 'Chargement des contacts …' },
  noContacts: {
    de: 'Keine Kontakte verfügbar',
    en: 'No contacts available',
    fr: 'Aucun contact disponible',
  },
  noMatch: {
    de: 'Keine Kontakte für deine Suche gefunden',
    en: 'No contacts found matching your search',
    fr: 'Aucun contact trouvé pour votre recherche',
  },
} satisfies Record<string, StaticTranslationString>;

/** The round mark at the end of a row: an empty ring, or brand green with a check. */
const SelectionMark: React.FC<{ isSelected: boolean }> = ({ isSelected }) => (
  <span
    aria-hidden="true"
    className={cn(
      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
      isSelected ? 'bg-conveniat-green text-white' : 'border-rail-node border-2',
    )}
  >
    {isSelected && <Check className="h-4 w-4" strokeWidth={3} />}
  </span>
);

/**
 * Creating a group: its name, the people chosen so far as chips and the contacts to choose
 * from, each a checkbox. "Gruppe erstellen" waits for two people and a name of 2 to 50
 * characters, the rules `createChat` holds a group to.
 */
export const CreateNewGroupPage: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { data: allContacts, isLoading } = trpc.chat.contacts.useQuery({});
  const { data: maxGroupMembers } = trpc.chat.getGroupMemberLimit.useQuery();
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Contact[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { createChat } = useCreateChat();
  const nameId = useId();
  const nameRuleId = useId();

  const reset = useCallback((): void => {
    setSelected([]);
    setGroupName('');
    setSearchQuery('');
    setIsCreating(false);
  }, []);

  // The route stays mounted, hidden, after leaving it; the draft belongs to this visit only.
  const isOnRoute = /\/app\/chat\/new\/group\/?$/.test(pathname);
  useEffect(() => {
    if (isOnRoute) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reset();
  }, [isOnRoute, reset]);

  // the creator is a member too
  const isAtLimit = maxGroupMembers !== undefined && selected.length + 1 >= maxGroupMembers;
  const trimmedName = groupName.trim();
  const hasValidName = trimmedName.length >= NAME_MIN && trimmedName.length <= NAME_MAX;
  const hasEnoughPeople = selected.length >= MIN_SELECTED;
  const canCreate = hasEnoughPeople && hasValidName && !isCreating;
  const isSelected = (contact: Contact): boolean =>
    selected.some((chosen) => chosen.userId === contact.userId);

  const toggle = (contact: Contact): void => {
    if (isSelected(contact)) {
      setSelected((previous) => previous.filter((chosen) => chosen.userId !== contact.userId));
      return;
    }
    if (isAtLimit) return;
    setSelected((previous) => [...previous, contact]);
    // the search found this contact; the next one is most likely someone else
    setSearchQuery('');
  };

  const create = (): void => {
    if (!canCreate) return;
    setIsCreating(true);
    // The id is chosen client-side, so the chat opens straight away, also while offline.
    const chatId = createChat({ chatName: trimmedName, members: selected });
    reset();
    // `replace`: going back from the new chat belongs to the list, not to this form
    router.replace(`/app/chat/${chatId}`);
  };

  const filteredContacts =
    allContacts
      ?.filter((contact) => matchesContactSearch(contact, searchQuery))
      .sort((a, b) => contactListName(a).localeCompare(contactListName(b), locale)) ?? [];

  let helper: string | undefined;
  if (!hasEnoughPeople) helper = text.needPeople[locale];
  else if (!hasValidName) helper = text.needName[locale];

  return (
    <NewChatFrame
      title={newChatText.groupTitle[locale]}
      subtitle={newChatText.groupSelected[locale].replace('{n}', String(selected.length))}
      backHref="/app/chat/new"
      onWhite
      backLabel={newChatText.groupBack[locale]}
      footer={
        <div className="flex flex-col gap-2">
          {helper !== undefined && (
            <p id="new-group-helper" className="text-center text-[13px] text-green-700">
              {helper}
            </p>
          )}
          <Button
            variant="primary"
            size="touch"
            className="w-full"
            onClick={create}
            disabled={!canCreate}
            aria-describedby={helper === undefined ? undefined : 'new-group-helper'}
          >
            {isCreating
              ? text.creating[locale]
              : `${text.create[locale]}${selected.length > 0 ? ` (${selected.length})` : ''}`}
          </Button>
        </div>
      }
    >
      <div className="border-line border-b bg-white px-4 pt-4 pb-3">
        <span id={nameId} className="block text-[13px] font-semibold text-green-900">
          {text.nameLabel[locale]}
        </span>
        <label className={cn(formFieldClassName, 'mt-1.5')}>
          <input
            value={groupName}
            maxLength={NAME_MAX}
            placeholder={text.namePlaceholder[locale]}
            onChange={(event) => setGroupName(event.target.value)}
            aria-labelledby={nameId}
            aria-describedby={nameRuleId}
            aria-invalid={trimmedName.length > 0 && !hasValidName}
            className={fieldInputClassName}
          />
        </label>
        <div
          id={nameRuleId}
          className="mt-1 flex justify-between text-xs text-green-700 tabular-nums"
        >
          <span>{text.nameRule[locale]}</span>
          <span aria-hidden="true">
            {groupName.length}/{NAME_MAX}
          </span>
        </div>

        {selected.length > 0 && (
          <ul aria-label={text.chosenPeople[locale]} className="mt-2 flex flex-wrap gap-x-2">
            {selected.map((contact) => (
              <li key={contact.userId}>
                <button
                  type="button"
                  onClick={() => toggle(contact)}
                  aria-label={text.remove[locale].replace('{name}', getContactDisplayName(contact))}
                  className="flex h-11 cursor-pointer items-center"
                >
                  <span className="bg-quiet flex h-9 items-center gap-2 rounded-full pr-3 pl-1">
                    <PersonAvatar
                      seed={contact.userId}
                      name={contact.name}
                      pictureUrl={contact.pictureUrl}
                      className="h-7 w-7 text-[11px]"
                    />
                    <span className="text-sm font-semibold text-green-900">
                      {getContactShortName(contact)}
                    </span>
                    <X className="h-4 w-4 text-green-700" aria-hidden="true" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="px-4 pt-3 pb-2">
        <ChatSearchField
          placeholder={text.search[locale]}
          value={searchQuery}
          onChange={setSearchQuery}
        />
        {isAtLimit && (
          <p className="mt-2 text-[13px] text-green-700">
            {text.limit[locale].replace('{max}', String(maxGroupMembers))}
          </p>
        )}
      </div>

      {isLoading && (
        <div role="status">
          <span className="sr-only">{text.loading[locale]}</span>
          <ContactRowsSkeleton withMark />
        </div>
      )}

      {!isLoading && filteredContacts.length === 0 && (
        <EmptyState
          icon={Users}
          title={searchQuery.trim() === '' ? text.noContacts[locale] : text.noMatch[locale]}
        />
      )}

      {!isLoading && filteredContacts.length > 0 && (
        <ul className="pb-6">
          {filteredContacts.map((contact) => {
            const isChosen = isSelected(contact);
            return (
              <li key={contact.userId} className={contactRowItemClassName}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isChosen}
                  disabled={!isChosen && isAtLimit}
                  onClick={() => toggle(contact)}
                  className={cn(
                    'flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-50',
                    isChosen ? 'bg-tint' : 'hover:bg-quiet',
                  )}
                >
                  <ContactRowContent contact={contact} />
                  <SelectionMark isSelected={isChosen} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </NewChatFrame>
  );
};
