import { Button } from '@/components/ui/buttons/button';
import { fieldInputClassName, formFieldClassName } from '@/components/ui/field';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Pencil } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

interface ChatNameSectionProperties {
  /** The group's icon or the other person's avatar, above the name. */
  avatar: React.ReactNode;
  currentName: string;
  /** e.g. "Gruppe · erstellt von dir", under the name */
  meta: string;
  description?: string | null | undefined;
  /** Whether the pencil is shown, see `ChatDetails`. */
  canRename: boolean;
  onSaveName: (newName: string) => void;
  isSaving: boolean;
  locale: Locale;
}

const chatNameText: StaticTranslationString = {
  de: 'Chat-Name',
  en: 'Chat name',
  fr: 'Nom du chat',
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

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 50;

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
    de: 'Chat-Name darf höchstens 50 Zeichen haben',
    en: 'Chat name can have at most 50 characters',
    fr: 'Le nom du chat peut contenir au plus 50 caractères',
  },
} satisfies Record<string, StaticTranslationString>;

const validateChatName = (name: string, locale: Locale): string => {
  if (name.trim().length === 0) return validationMessages.emptyName[locale];
  if (name.trim().length < MIN_NAME_LENGTH) return validationMessages.tooShort[locale];
  if (name.trim().length > MAX_NAME_LENGTH) return validationMessages.tooLong[locale];
  return '';
};

/**
 * The head of the chat details: who or what the chat is, its name with the pencil to rename
 * it in place, what kind of chat it is and who made it, and its description.
 */
export const ChatNameSection: React.FC<ChatNameSectionProperties> = ({
  avatar,
  currentName,
  meta,
  description,
  canRename,
  onSaveName,
  isSaving,
  locale,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentName);
  // the rule is only shown once a save broke it, or once the name runs too long
  const [hasTriedToSave, setHasTriedToSave] = useState(false);

  const validationError = validateChatName(name, locale);
  const isTooLong = name.trim().length > MAX_NAME_LENGTH;
  const shownError = hasTriedToSave || isTooLong ? validationError : '';

  const stopEditing = (): void => {
    setName(currentName);
    setIsEditing(false);
    setHasTriedToSave(false);
  };

  const handleSave = (): void => {
    if (validationError !== '') {
      setHasTriedToSave(true);
      return;
    }
    if (name.trim() !== currentName) onSaveName(name.trim());
    setIsEditing(false);
    setHasTriedToSave(false);
  };

  return (
    <section className="flex flex-col items-center text-center">
      {avatar}
      {isEditing ? (
        <div className="mt-4 w-full max-w-sm space-y-2 text-left">
          <label className={cn(formFieldClassName, shownError !== '' && 'border-danger')}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSave();
                else if (event.key === 'Escape') stopEditing();
              }}
              autoFocus
              aria-label={chatNameText[locale]}
              aria-invalid={shownError !== ''}
              aria-describedby="chat-name-hint"
              className={fieldInputClassName}
              placeholder={chatNamePlaceholder[locale]}
              disabled={isSaving}
            />
          </label>
          <p
            id="chat-name-hint"
            aria-live="polite"
            className={cn(
              'flex justify-between gap-3 text-[13px]',
              shownError === '' ? 'text-green-700' : 'text-danger-text font-semibold',
            )}
          >
            <span>{shownError}</span>
            <span className="shrink-0 tabular-nums">
              {name.trim().length}/{MAX_NAME_LENGTH}
            </span>
          </p>
          <div className="flex justify-center gap-2 pt-1">
            <Button variant="primary" size="touch" onClick={handleSave} disabled={isSaving}>
              {saveText[locale]}
            </Button>
            <Button variant="quiet" size="touch" onClick={stopEditing} disabled={isSaving}>
              {cancelText[locale]}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex max-w-full items-center gap-1">
          {/* a pencil on the right only: its width on the left keeps the name centred */}
          {canRename && <span className="w-11 shrink-0" aria-hidden="true" />}
          <h2 className="font-heading text-heading min-w-0 text-[24px] leading-tight font-extrabold wrap-anywhere">
            {currentName}
          </h2>
          {canRename && (
            <Button
              variant="ghost"
              size="touchIcon"
              className="shrink-0 text-green-700"
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
      )}
      {meta !== '' && <p className="mt-1 text-[13px] text-green-700">{meta}</p>}
      {description && description.trim() !== '' && (
        <p className="mt-3 max-w-md text-[15px] leading-normal whitespace-pre-wrap text-green-900">
          {description}
        </p>
      )}
    </section>
  );
};
