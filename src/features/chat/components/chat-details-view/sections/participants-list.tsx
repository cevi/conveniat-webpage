import { Button } from '@/components/ui/buttons/button';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Loader2, UserCircle, UserX, Users, X } from 'lucide-react';
import type React from 'react';

interface ParticipantsListProperties {
  participants: Array<{
    id: string;
    name: string;
    chatPermission: string;
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
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="font-body text-sm font-medium text-gray-600">
          {participants.length} {participantsSectionText[locale]}
        </div>
        {isGroupChat && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleManage}
            className="h-8 gap-2 px-2 hover:bg-gray-100"
          >
            {isManaging ? doneText[locale] : manageText[locale]}
            {isManaging ? <X className="h-4 w-4" /> : <Users className="h-4 w-4 text-gray-600" />}
          </Button>
        )}
      </div>

      <div className="max-h-60 space-y-3 overflow-y-auto">
        {participants.map((participant) => (
          <div key={participant.id} className="flex items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                <UserCircle className="h-8 w-8 text-gray-600" />
              </div>
              <div>
                <div className="font-body font-medium text-gray-900">
                  {participant.name}
                  {participant.id === currentUser && (
                    <span className="ml-1 text-sm text-gray-500">
                      ({youText[locale]}, {participant.chatPermission})
                    </span>
                  )}
                  {participant.id !== currentUser && (
                    <span className="ml-1 text-sm text-gray-500">
                      ({participant.chatPermission})
                    </span>
                  )}
                </div>
              </div>
            </div>
            {isManaging && participant.id !== currentUser && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveParticipant(participant.id)}
                disabled={isRemoving}
                className="h-8 w-8 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600"
              >
                {isRemoving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserX className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
