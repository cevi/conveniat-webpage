import { Button } from '@/components/ui/buttons/button';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { SectionLabel } from '@/components/ui/section-label';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Loader2, UserX, Users, X } from 'lucide-react';
import type React from 'react';

interface ParticipantsListProperties {
  participants: Array<{
    id: string;
    name: string;
    chatPermission: string;
    description?: string | null;
    /** e.g. "Ressortleitung Infrastruktur", empty for someone without a function */
    funktionLine?: string;
    /** e.g. "Cevi Uster · Quartier 2", empty for someone at no Hof */
    hofLine?: string;
    pictureUrl?: string | undefined;
  }>;
  currentUser: string | undefined;
  isGroupChat: boolean;
  isManaging: boolean;
  onToggleManage: () => void;
  onRemoveParticipant: (id: string) => void;
  isRemoving: boolean;
  locale: Locale;
}

const participantsSectionText: StaticTranslationString = {
  de: 'Teilnehmer',
  en: 'Participants',
  fr: 'Participants',
};

const doneText: StaticTranslationString = {
  de: 'Fertig',
  en: 'Done',
  fr: 'Terminé',
};

const manageText: StaticTranslationString = {
  de: 'Verwalten',
  en: 'Manage',
  fr: 'Gérer',
};

const youText: StaticTranslationString = {
  de: 'Du',
  en: 'You',
  fr: 'Vous',
};

const removeText: StaticTranslationString = {
  de: '{name} entfernen',
  en: 'Remove {name}',
  fr: 'Retirer {name}',
};

/** What a role is called; a member is the default and gets no chip. */
const permissionText: Record<string, StaticTranslationString | undefined> = {
  OWNER: { de: 'Erstellt', en: 'Creator', fr: 'Créateur' },
  ADMIN: { de: 'Admin', en: 'Admin', fr: 'Admin' },
  GUEST: { de: 'Gast', en: 'Guest', fr: 'Invité' },
};

const chipClassName = 'shrink-0 rounded-md px-1.5 py-0.5 text-xs font-bold';

export const ParticipantsList: React.FC<ParticipantsListProperties> = ({
  participants,
  currentUser,
  isGroupChat,
  isManaging,
  onToggleManage,
  onRemoveParticipant,
  isRemoving,
  locale,
}) => {
  return (
    <section>
      <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
        <SectionLabel>
          {participants.length} {participantsSectionText[locale]}
        </SectionLabel>
        {isGroupChat && (
          <Button variant="quiet" size="touch" onClick={onToggleManage} aria-pressed={isManaging}>
            {isManaging ? <X aria-hidden="true" /> : <Users aria-hidden="true" />}
            {isManaging ? doneText[locale] : manageText[locale]}
          </Button>
        )}
      </div>

      <ul className="border-line divide-line divide-y overflow-hidden rounded-[14px] border bg-white">
        {participants.map((participant) => {
          const isYou = participant.id === currentUser;
          const permission = permissionText[participant.chatPermission]?.[locale];
          return (
            <li key={participant.id} className="flex min-h-[64px] items-center gap-3 px-4 py-3">
              <PersonAvatar
                seed={participant.id}
                name={participant.name}
                pictureUrl={participant.pictureUrl}
                className="h-11 w-11 text-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <span className="text-[15px] leading-5 font-semibold text-green-900">
                    {participant.name}
                  </span>
                  {isYou && (
                    <span className={cn(chipClassName, 'bg-conveniat-green text-white')}>
                      {youText[locale]}
                    </span>
                  )}
                  {permission !== undefined && (
                    <span className={cn(chipClassName, 'bg-chip text-green-900')}>
                      {permission}
                    </span>
                  )}
                </div>
                {participant.description && (
                  <div className="mt-0.5 text-[13px] text-green-700">{participant.description}</div>
                )}
                {participant.funktionLine !== undefined && participant.funktionLine !== '' && (
                  <div className="text-conveniat-green mt-0.5 text-[13px] font-semibold">
                    {participant.funktionLine}
                  </div>
                )}
                {participant.hofLine !== undefined && participant.hofLine !== '' && (
                  <div className="mt-0.5 text-[13px] text-green-700">{participant.hofLine}</div>
                )}
              </div>
              {isManaging && !isYou && (
                <Button
                  variant="outlined"
                  size="touchIcon"
                  onClick={() => onRemoveParticipant(participant.id)}
                  disabled={isRemoving}
                  aria-label={removeText[locale].replace('{name}', participant.name)}
                >
                  {isRemoving ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <UserX aria-hidden="true" />
                  )}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
