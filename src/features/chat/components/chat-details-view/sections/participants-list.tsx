import { IconTile } from '@/components/ui/icon-tile';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { SectionLabel } from '@/components/ui/section-label';
import { splitDisplayName } from '@/features/chat/utils/split-display-name';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { MoreHorizontal, UserPlus } from 'lucide-react';
import type React from 'react';

export interface DetailsParticipant {
  id: string;
  name: string;
  chatPermission: string;
  description?: string | null;
  /** e.g. "Ressortleitung Infrastruktur", empty for someone without a function */
  funktionLine?: string;
  /** e.g. "Cevi Uster · Quartier 2", empty for someone at no Hof */
  hofLine?: string;
  pictureUrl?: string | undefined;
}

interface ParticipantsListProperties {
  participants: DetailsParticipant[];
  currentUser: string | undefined;
  /** Shows the row that opens the add sheet; for the chat's admins in a group. */
  onAdd: (() => void) | undefined;
  /**
   * What a tap on someone else does: open the sheet of actions on them when there is more than
   * one, otherwise the one action, writing to them. Undefined for someone with neither.
   */
  actionFor: (
    participant: DetailsParticipant,
  ) => { kind: 'menu' | 'message'; run: () => void } | undefined;
  locale: Locale;
}

const participantsText = (count: number, locale: Locale): string => {
  if (locale === 'de') return `${count} Teilnehmende`;
  if (locale === 'fr') return `${count} participant·es`;
  return count === 1 ? '1 participant' : `${count} participants`;
};

const addParticipantsText: StaticTranslationString = {
  de: 'Teilnehmende hinzufügen',
  en: 'Add participants',
  fr: 'Ajouter des participant·es',
};

const youText: StaticTranslationString = {
  de: 'Du',
  en: 'You',
  fr: 'Toi',
};

const actionsForText: StaticTranslationString = {
  de: 'Aktionen für {name}',
  en: 'Actions for {name}',
  fr: 'Actions pour {name}',
};

const messageToText: StaticTranslationString = {
  de: 'Nachricht an {name}',
  en: 'Message {name}',
  fr: 'Message à {name}',
};

/** What a role is called; a member is the default and gets no chip. */
const permissionText: Record<string, StaticTranslationString | undefined> = {
  // the one who created the chat is one of its admins, which is what matters here
  OWNER: { de: 'Admin', en: 'Admin', fr: 'Admin' },
  ADMIN: { de: 'Admin', en: 'Admin', fr: 'Admin' },
  GUEST: { de: 'Gast', en: 'Guest', fr: 'Invité·e' },
};

const chipClassName = 'shrink-0 rounded-md px-1.5 py-0.5 text-[11px] leading-4 font-bold';

const ParticipantBody: React.FC<{
  participant: DetailsParticipant;
  isYou: boolean;
  locale: Locale;
}> = ({ participant, isYou, locale }) => {
  const { primary, secondary } = splitDisplayName(participant.name);
  const permission = permissionText[participant.chatPermission]?.[locale];
  const subtitle = [participant.description, participant.funktionLine, participant.hofLine]
    .filter((line): line is string => typeof line === 'string' && line !== '')
    .join(' · ');
  return (
    <>
      <PersonAvatar
        seed={participant.id}
        name={participant.name}
        pictureUrl={participant.pictureUrl}
        className="h-11 w-11 text-sm"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] leading-5 text-green-900">
          <span className="font-semibold">{primary}</span>
          {secondary !== undefined && <span className="text-green-700"> {secondary}</span>}
        </span>
        {subtitle !== '' && (
          <span className="mt-0.5 block truncate text-[13px] text-green-700">{subtitle}</span>
        )}
        {(isYou || permission !== undefined) && (
          <span className="mt-1 flex gap-1">
            {isYou && (
              <span className={cn(chipClassName, 'bg-conveniat-green text-white')}>
                {youText[locale]}
              </span>
            )}
            {permission !== undefined && (
              <span className={cn(chipClassName, 'bg-chip text-green-900')}>{permission}</span>
            )}
          </span>
        )}
      </span>
    </>
  );
};

/**
 * The people of a chat in one card: the row to add someone for those who may, then everyone
 * with their Ceviname, function and Hof, and a "⋯" with what can be done about them.
 */
export const ParticipantsList: React.FC<ParticipantsListProperties> = ({
  participants,
  currentUser,
  onAdd,
  actionFor,
  locale,
}) => {
  // a row fills its card, which clips a ring outside it
  const rowClassName =
    'flex min-h-[64px] w-full items-center gap-3 px-4 py-2.5 text-left focus-visible:focus-ring-inset';
  return (
    <section>
      <SectionLabel className="mb-2">{participantsText(participants.length, locale)}</SectionLabel>
      <ul className="border-line divide-line divide-y overflow-hidden rounded-[14px] border bg-white">
        {onAdd !== undefined && (
          <li>
            <button
              type="button"
              onClick={onAdd}
              className={cn(rowClassName, 'hover:bg-quiet cursor-pointer')}
            >
              <IconTile icon={UserPlus} className="h-11 w-11 rounded-full" />
              <span className="text-[15px] font-semibold text-green-900">
                {addParticipantsText[locale]}
              </span>
            </button>
          </li>
        )}
        {participants.map((participant) => {
          const isYou = participant.id === currentUser;
          const action = isYou ? undefined : actionFor(participant);
          const body = <ParticipantBody participant={participant} isYou={isYou} locale={locale} />;
          const displayName = splitDisplayName(participant.name).primary;

          if (action?.kind === 'message') {
            // writing to them is all there is to do, so the row itself does it
            return (
              <li key={participant.id}>
                <button
                  type="button"
                  onClick={action.run}
                  aria-label={messageToText[locale].replace('{name}', displayName)}
                  className={cn(rowClassName, 'hover:bg-quiet cursor-pointer')}
                >
                  {body}
                </button>
              </li>
            );
          }
          return (
            <li key={participant.id} className={cn(rowClassName, action && 'pr-2')}>
              {body}
              {action !== undefined && (
                <button
                  type="button"
                  onClick={action.run}
                  aria-label={actionsForText[locale].replace('{name}', displayName)}
                  aria-haspopup="dialog"
                  className="hover:bg-quiet flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-green-700"
                >
                  <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
