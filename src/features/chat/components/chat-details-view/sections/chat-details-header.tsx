import { Button } from '@/components/ui/buttons/button';
import type { Locale, StaticTranslationString } from '@/types/types';
import { ArrowLeft, Settings } from 'lucide-react';
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

const saveText: StaticTranslationString = {
  de: 'Speichern',
  en: 'Save',
  fr: 'Enregistrer',
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
    <div className="flex h-16 items-center gap-3 border-b-2 border-gray-200 bg-white px-4">
      <Link href={`/app/chat/${chatId}`}>
        <Button variant="ghost" size="icon" className="mr-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </Button>
      </Link>
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-gray-700" />
        <h1 className="font-heading text-lg font-semibold text-gray-900">Chat Details</h1>
      </div>
      <div className="ml-auto">
        {isEditingName && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancelEdit}
              className="font-body border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onSaveName}
              disabled={!isFormValid || isSaving}
              className="bg-conveniat-green font-body text-white hover:bg-green-600 disabled:bg-gray-300"
            >
              {saveText[locale]} {isSaving ? '...' : ''}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
