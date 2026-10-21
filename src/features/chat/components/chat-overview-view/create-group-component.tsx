'use client';
import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import { fieldInputClassName, formFieldClassName } from '@/components/ui/field';
import { PersonAvatar } from '@/components/ui/person-avatar';
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
import { ChatSearchField } from '@/features/chat/components/ui/chat-search-field';
import { useCreateChat } from '@/features/chat/hooks/use-create-chat';
import { groupContactsByLetter, matchesContactSearch } from '@/features/chat/utils/contact-search';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { getContactDisplayName, getContactShortName } from '@/utils/format-user-name';
import { cn } from '@/utils/tailwindcss-override';
import { Check, Users, X } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { useCallback, useEffect, useId, useState } from 'react';

/** The search parameter of the second step, so the back button returns to the first. */
const STEP_PARAMETER = 'step';

/** The bounds `createChat` holds a group name to, see `verifyChatName`. */
const NAME_MIN = 2;
const NAME_MAX = 50;
/** A group has the creator and at least two others; with one it is a private chat. */
const MIN_SELECTED = 2;

const text = {
  nameLabel: { de: 'Gruppenname', en: 'Group name', fr: 'Nom du groupe' },
  namePlaceholder: { de: 'Name der Gruppe', en: 'Name of the group', fr: 'Nom du groupe' },
  nameTooShort: {
    de: `Der Name braucht mindestens ${NAME_MIN} Zeichen.`,
    en: `The name needs at least ${NAME_MIN} characters.`,
    fr: `Le nom doit compter au moins ${NAME_MIN} caractères.`,
  },
  members: {
    de: 'Mit dir in der Gruppe',
    en: 'In the group with you',
    fr: 'Avec toi dans le groupe',
  },
  search: { de: 'Kontakte hinzufügen', en: 'Add contacts', fr: 'Ajouter des contacts' },
  remove: { de: '{name} entfernen', en: 'Remove {name}', fr: 'Retirer {name}' },
  chosenPeople: { de: 'Ausgewählte Personen', en: 'Selected people', fr: 'Personnes choisies' },
  needPeople: {
    de: 'Wähle mindestens zwei Personen aus.',
    en: 'Choose at least two people.',
    fr: 'Choisis au moins deux personnes.',
  },
  pickBack: { de: 'Zurück zur Auswahl', en: 'Back to the selection', fr: 'Retour à la sélection' },
  limit: {
    de: 'Eine Gruppe hat höchstens {max} Mitglieder, dich eingeschlossen.',
    en: 'A group can have at most {max} members, including you.',
    fr: 'Un groupe compte au plus {max} membres, toi compris.',
  },
  next: { de: 'Weiter', en: 'Next', fr: 'Suivant' },
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

/** A disabled footer button stays legible: green text on the quiet grey, not a faded green. */
const footerButtonClassName =
  'w-full disabled:bg-quiet disabled:text-green-700 disabled:opacity-100';

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
 * Creating a group in two steps. First the people: the contacts as checkboxes, the chosen ones
 * as chips, and "Weiter" once two are chosen. Then the name, 2 to 50 characters, and "Gruppe
 * erstellen" — the rules `createChat` holds a group to. The second step has its own history
 * entry, so going back, by the arrow or the phone's back, returns to the choice as it was.
 */
export const CreateNewGroupPage: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { data: allContacts, isLoading } = trpc.chat.contacts.useQuery({});
  const { data: maxGroupMembers } = trpc.chat.getGroupMemberLimit.useQuery();
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Contact[]>([]);
  const [groupName, setGroupName] = useState('');
  const [hasLeftName, setHasLeftName] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();
  const { createChat } = useCreateChat();
  const nameId = useId();
  const nameErrorId = useId();

  const reset = useCallback((): void => {
    setSelected([]);
    setGroupName('');
    setHasLeftName(false);
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
  // a reload on the second step has lost the choice, so it starts over with the first
  const isNaming = searchParameters.get(STEP_PARAMETER) === 'name' && hasEnoughPeople;
  const canCreate = hasEnoughPeople && hasValidName && !isCreating;
  // the rule only shows once it is broken, not while the name is still being typed
  const showNameError = hasLeftName && trimmedName.length > 0 && !hasValidName;
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

  const goToNaming = (): void => {
    if (!hasEnoughPeople) return;
    const url = new URL(globalThis.location.href);
    url.searchParams.set(STEP_PARAMETER, 'name');
    // the native history call keeps Next's router in sync without a round trip
    globalThis.history.pushState(undefined, '', url);
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

  const subtitle = newChatText.groupSelected[locale].replace('{n}', String(selected.length));

  if (isNaming) {
    return (
      <NewChatFrame
        title={newChatText.groupTitle[locale]}
        subtitle={subtitle}
        onBack={() => globalThis.history.back()}
        backLabel={text.pickBack[locale]}
        onWhite
        footer={
          <Button
            variant="primary"
            size="touch"
            className={footerButtonClassName}
            onClick={create}
            disabled={!canCreate}
          >
            {isCreating ? text.creating[locale] : text.create[locale]}
          </Button>
        }
      >
        <div className="px-4 pt-4 pb-3">
          <label htmlFor={nameId} className="block text-[13px] font-semibold text-green-900">
            {text.nameLabel[locale]}
          </label>
          <div className={cn(formFieldClassName, 'mt-1.5')}>
            <input
              id={nameId}
              // the step exists for the name, so the keyboard comes up with it
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              value={groupName}
              maxLength={NAME_MAX}
              placeholder={text.namePlaceholder[locale]}
              onChange={(event) => setGroupName(event.target.value)}
              onBlur={() => setHasLeftName(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') create();
              }}
              enterKeyHint="done"
              aria-invalid={showNameError}
              aria-describedby={showNameError ? nameErrorId : undefined}
              className={fieldInputClassName}
            />
          </div>
          <div className="mt-1 flex justify-between gap-3 text-xs text-green-700 tabular-nums">
            <span
              id={nameErrorId}
              role={showNameError ? 'alert' : undefined}
              className="text-danger-text font-semibold"
            >
              {showNameError ? text.nameTooShort[locale] : ''}
            </span>
            <span aria-hidden="true" className="shrink-0">
              {groupName.length}/{NAME_MAX}
            </span>
          </div>
        </div>

        <section className="border-line border-t pt-4 pb-6">
          <SectionLabel className="px-4">
            {text.members[locale]} ({selected.length})
          </SectionLabel>
          <ul className="pt-2">
            {selected.map((contact) => (
              <li key={contact.userId} className={contactRowItemClassName}>
                <div className="flex min-h-16 items-center gap-3 px-4 py-2.5">
                  <ContactRowContent contact={contact} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </NewChatFrame>
    );
  }

  const filteredContacts =
    allContacts?.filter((contact) => matchesContactSearch(contact, searchQuery)) ?? [];
  const groups = groupContactsByLetter(filteredContacts, contactListName, locale);

  return (
    <NewChatFrame
      title={newChatText.groupTitle[locale]}
      subtitle={subtitle}
      backHref="/app/chat/new"
      backLabel={newChatText.groupBack[locale]}
      onWhite
      head={
        <ChatSearchField
          placeholder={text.search[locale]}
          value={searchQuery}
          onChange={setSearchQuery}
        />
      }
      footer={
        <div className="flex flex-col gap-2">
          {/* the chosen people sit down here, not above the list: a strip appearing over the
              list would push every row down under the finger that is about to tap the next one */}
          {selected.length > 0 && (
            <ul
              aria-label={text.chosenPeople[locale]}
              className="-mx-4 flex [scrollbar-width:none] gap-x-2 overflow-x-auto px-4"
            >
              {selected.map((contact) => (
                <li key={contact.userId} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => toggle(contact)}
                    aria-label={text.remove[locale].replace(
                      '{name}',
                      getContactDisplayName(contact),
                    )}
                    className="group flex h-11 cursor-pointer items-center focus-visible:outline-none"
                  >
                    <span className="bg-quiet group-focus-visible:focus-ring flex h-9 items-center gap-2 rounded-full pr-3 pl-1">
                      <PersonAvatar
                        seed={contact.userId}
                        name={contact.name}
                        pictureUrl={contact.pictureUrl}
                        className="h-7 w-7 text-[11px]"
                      />
                      <span className="text-sm font-semibold whitespace-nowrap text-green-900">
                        {getContactShortName(contact)}
                      </span>
                      <X className="h-4 w-4 text-green-700" aria-hidden="true" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {isAtLimit && (
            <p className="text-center text-[13px] text-green-700">
              {text.limit[locale].replace('{max}', String(maxGroupMembers))}
            </p>
          )}
          {!hasEnoughPeople && (
            <p id="new-group-helper" className="text-center text-[13px] text-green-700">
              {text.needPeople[locale]}
            </p>
          )}
          <Button
            variant="primary"
            size="touch"
            className={footerButtonClassName}
            onClick={goToNaming}
            disabled={!hasEnoughPeople}
            aria-describedby={hasEnoughPeople ? undefined : 'new-group-helper'}
          >
            {text.next[locale]}
            {selected.length > 0 && ` (${selected.length})`}
          </Button>
        </div>
      }
    >
      {isLoading && (
        <div role="status" className="pt-2">
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

      {!isLoading &&
        groups.map(({ letter, contacts }) => (
          <div key={letter ?? 'all'} className="pt-2 last:pb-6">
            {letter !== undefined && (
              <h3 className="px-4 pt-1 pb-1 text-xs font-bold text-green-700">{letter}</h3>
            )}
            <ul>
              {contacts.map((contact) => {
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
                        'focus-visible:focus-ring-inset flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-50',
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
          </div>
        ))}
    </NewChatFrame>
  );
};
