import { Button } from '@/components/ui/buttons/button';
import type { Locale, StaticTranslationString } from '@/types/types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

interface ChatDetailsHeaderProperties {
  chatId: string;
  isEditingName: boolean;
  onCancelEdit: () => void;
  onSaveName: () => void;
  isSaving: boolean;
  isFormValid: boolean;
  locale: Locale;
}

const chatDetailsText: StaticTranslationString = {
  de: 'Chat-Details',
  en: 'Chat Details',
  fr: 'Détails de la discussion',
};

const saveText: StaticTranslationString = {
  de: 'Speichern',
  en: 'Save',
  fr: 'Enregistrer',
};

const cancelText: StaticTranslationString = {
  de: 'Abbrechen',
  en: 'Cancel',
  fr: 'Annuler',
};

const backText: StaticTranslationString = {
  de: 'Zurück zum Chat',
  en: 'Back to chat',
  fr: 'Retour au chat',
};

export const ChatDetailsHeader: React.FC<ChatDetailsHeaderProperties> = ({
  chatId,
  isEditingName,
  onCancelEdit,
  onSaveName,
  isSaving,
  isFormValid,
  locale,
}) => {
  return (
    <div className="border-line flex h-[60px] shrink-0 items-center gap-1 border-b bg-white pr-2 pl-1">
      <Link
        href={`/app/chat/${chatId}`}
        aria-label={backText[locale]}
        className="hover:bg-quiet flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-green-900"
      >
        <ArrowLeft className="h-[22px] w-[22px]" aria-hidden="true" />
      </Link>
      <h1 className="font-heading text-heading min-w-0 flex-1 truncate pl-1 text-[17px] font-bold">
        {chatDetailsText[locale]}
      </h1>
      {isEditingName && (
        <div className="flex gap-2">
          <Button variant="quiet" size="touch" onClick={onCancelEdit}>
            {cancelText[locale]}
          </Button>
          <Button
            variant="primary"
            size="touch"
            onClick={onSaveName}
            disabled={!isFormValid || isSaving}
          >
            {saveText[locale]} {isSaving ? '...' : ''}
          </Button>
        </div>
      )}
    </div>
  );
};
