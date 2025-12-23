import { Button } from '@/components/ui/buttons/button';
import { Input } from '@/components/ui/input';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Pencil } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

interface ChatNameSectionProperties {
  currentName: string;
  isGroupChat: boolean;
  onSaveName: (newName: string) => void;
  isSaving: boolean;
  locale: Locale;
}

const chatNameSectionText: StaticTranslationString = {
  de: 'Chat-Name',
  en: 'Chat Name',
  fr: 'Nom du chat',
};

const chatNamePlaceholder: StaticTranslationString = {
  de: 'Chat-Namen eingeben',
  en: 'Enter chat name',
  fr: 'Entrez le nom du chat',
};

const chatNameLengthText: StaticTranslationString = {
  de: 'Chat-Name muss zwischen 2-50 Zeichen lang sein',
  en: 'Chat name must be between 2-50 characters',
  fr: 'Le nom du chat doit contenir entre 2 et 50 caractères',
};

const validationMessages = {
  emptyName: {
    de: 'Chat-Name darf nicht leer sein',
    en: 'Chat name cannot be empty',
    fr: 'Le nom du chat ne peut pas être vide',
  } as StaticTranslationString,
  tooShort: {
    de: 'Chat-Name muss mindestens 2 Zeichen haben',
    en: 'Chat name must be at least 2 characters',
    fr: 'Le nom du chat doit contenir au moins 2 caractères',
  } as StaticTranslationString,
  tooLong: {
    de: 'Chat-Name muss weniger als 50 Zeichen haben',
    en: 'Chat name must be less than 50 characters',
    fr: 'Le nom du chat doit contenir moins de 50 caractères',
  } as StaticTranslationString,
};

const validateChatName = (name: string, locale: Locale): string => {
  if (name.trim().length === 0) return validationMessages.emptyName[locale];
  if (name.trim().length < 2) return validationMessages.tooShort[locale];
  if (name.trim().length > 50) return validationMessages.tooLong[locale];
  return '';
};

export const ChatNameSection: React.FC<ChatNameSectionProperties> = ({
  currentName,
  isGroupChat,
  onSaveName,
  isSaving,
  locale,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [error, setError] = useState('');

  const handleSave = (): void => {
    const validationError = validateChatName(name, locale);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (name.trim() !== '' && name !== currentName) {
      onSaveName(name.trim());
      setIsEditing(false);
    } else {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') handleSave();
    else if (event.key === 'Escape') {
      setName(currentName);
      setIsEditing(false);
      setError('');
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="font-body text-sm font-medium text-gray-600">
          {chatNameSectionText[locale]}
        </div>
        {isGroupChat && !isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setName(currentName);
              setIsEditing(true);
            }}
            className="h-8 px-2 hover:bg-gray-100"
          >
            <Pencil className="h-4 w-4 text-gray-600" />
          </Button>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError('');
              }}
              onKeyDown={handleKeyDown}
              autoFocus
              className={`font-body focus:ring-conveniat-green flex-1 ${error
                  ? 'border-red-300 focus:border-red-500'
                  : 'focus:border-conveniat-green border-gray-300'
                }`}
              placeholder={chatNamePlaceholder[locale]}
              disabled={isSaving}
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-conveniat-green text-white hover:bg-green-600"
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setName(currentName);
                setIsEditing(false);
                setError('');
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
          {error && <p className="font-body text-sm text-red-600">{error}</p>}
          <p className="font-body text-xs text-gray-500">{chatNameLengthText[locale]}</p>
        </div>
      ) : (
        <div className="font-heading text-lg font-semibold text-gray-900">{currentName}</div>
      )}
    </div>
  );
};
