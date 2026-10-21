import { Button } from '@/components/ui/buttons/button';
import { Input } from '@/components/ui/input';
import { SectionLabel } from '@/components/ui/section-label';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Pencil } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

interface ChatNameSectionProperties {
  currentName: string;
  description?: string | null | undefined;
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

const chatDescriptionLabelText: StaticTranslationString = {
  de: 'Beschreibung',
  en: 'Description',
  fr: 'Description',
};

const chatNamePlaceholder: StaticTranslationString = {
  de: 'Chat-Namen eingeben',
  en: 'Enter chat name',
  fr: 'Entrez le nom du chat',
};

const editNameText: StaticTranslationString = {
  de: 'Namen ändern',
  en: 'Edit name',
  fr: 'Modifier le nom',
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
  },
  tooShort: {
    de: 'Chat-Name muss mindestens 2 Zeichen haben',
    en: 'Chat name must be at least 2 characters',
    fr: 'Le nom du chat doit contenir au moins 2 caractères',
  },
  tooLong: {
    de: 'Chat-Name muss weniger als 50 Zeichen haben',
    en: 'Chat name must be less than 50 characters',
    fr: 'Le nom du chat doit contenir moins de 50 caractères',
  },
};

const validateChatName = (name: string, locale: Locale): string => {
  if (name.trim().length === 0) return validationMessages.emptyName[locale];
  if (name.trim().length < 2) return validationMessages.tooShort[locale];
  if (name.trim().length > 50) return validationMessages.tooLong[locale];
  return '';
};

export const ChatNameSection: React.FC<ChatNameSectionProperties> = ({
  currentName,
  description,
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
    <section>
      <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
        <SectionLabel>{chatNameSectionText[locale]}</SectionLabel>
        {isGroupChat && !isEditing && (
          <Button
            variant="quiet"
            size="touchIcon"
            onClick={() => {
              setName(currentName);
              setIsEditing(true);
            }}
            aria-label={editNameText[locale]}
          >
            <Pencil aria-hidden="true" />
          </Button>
        )}
      </div>
      <div className="border-line rounded-[14px] border bg-white p-4">
        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError('');
              }}
              onKeyDown={handleKeyDown}
              autoFocus
              aria-label={chatNameSectionText[locale]}
              aria-invalid={error !== ''}
              className={cn(
                'border-line h-11 rounded-xl border bg-white px-4 text-[15px] text-green-900 shadow-none placeholder:text-green-500',
                'focus-visible:border-conveniat-green focus-visible:ring-0',
                error !== '' && 'border-green-900',
              )}
              placeholder={chatNamePlaceholder[locale]}
              disabled={isSaving}
            />
            <p
              aria-live="polite"
              className={cn(
                'text-[13px]',
                error === '' ? 'text-green-500' : 'font-semibold text-green-900',
              )}
            >
              {error === '' ? chatNameLengthText[locale] : error}
            </p>
            <div className="flex gap-2 pt-1">
              <Button variant="primary" size="touch" onClick={handleSave} disabled={isSaving}>
                {saveText[locale]}
              </Button>
              <Button
                variant="quiet"
                size="touch"
                onClick={() => {
                  setName(currentName);
                  setIsEditing(false);
                  setError('');
                }}
                disabled={isSaving}
              >
                {cancelText[locale]}
              </Button>
            </div>
          </div>
        ) : (
          <p className="font-heading text-heading text-lg font-bold">{currentName}</p>
        )}
        {description && description.trim() !== '' && (
          <div className="border-line mt-4 border-t pt-4">
            <SectionLabel as="h3">{chatDescriptionLabelText[locale]}</SectionLabel>
            <p className="mt-1 text-[15px] leading-normal whitespace-pre-wrap text-green-900">
              {description}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
