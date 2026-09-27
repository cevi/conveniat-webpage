'use client';

import { PersonAvatar } from '@/components/ui/person-avatar';
import { useProfilePicture } from '@/features/settings/hooks/use-profile-picture';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import type React from 'react';
import { useRef, useState } from 'react';

const avatarLabel: StaticTranslationString = {
  de: 'Profilbild ändern',
  en: 'Change profile picture',
  fr: 'Modifier la photo de profil',
};

const visibilityHint: StaticTranslationString = {
  de: 'Dein Profilbild sehen alle, die in der App angemeldet sind, z.B. im Adressbuch und im Chat.',
  en: 'Everyone logged in to the app sees your profile picture, e.g. in the address book and in chats.',
  fr: "Toutes les personnes connectées à l'application voient ta photo de profil, p. ex. dans le carnet d'adresses et les chats.",
};

const uploadLabel: StaticTranslationString = {
  de: 'Foto hochladen',
  en: 'Upload a photo',
  fr: 'Téléverser une photo',
};

const replaceLabel: StaticTranslationString = {
  de: 'Anderes Foto wählen',
  en: 'Choose another photo',
  fr: 'Choisir une autre photo',
};

const removeLabel: StaticTranslationString = {
  de: 'Foto entfernen',
  en: 'Remove photo',
  fr: 'Retirer la photo',
};

const failedText: StaticTranslationString = {
  de: 'Das hat nicht geklappt. Versuche es mit einem anderen Foto oder später nochmals.',
  en: 'That did not work. Try another photo, or again later.',
  fr: "Cela n'a pas fonctionné. Essaie une autre photo ou réessaie plus tard.",
};

/**
 * The user's own avatar in the settings. A tap opens what can be done with it: upload a photo,
 * choose another one, or remove it again.
 */
export const ProfileAvatar: React.FC<{
  userId: string;
  name: string;
  pictureUrl: string | undefined;
  locale: Locale;
}> = ({ userId, name, pictureUrl: initialPictureUrl, locale }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { pictureUrl, isBusy, hasFailed, upload, remove } = useProfilePicture(initialPictureUrl);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsMenuOpen((open) => !open)}
        aria-expanded={isMenuOpen}
        aria-label={avatarLabel[locale]}
        className="relative block cursor-pointer rounded-full"
      >
        <PersonAvatar
          seed={userId}
          name={name}
          pictureUrl={pictureUrl}
          className="h-14 w-14 text-lg"
        />
        <span className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm ring-1 ring-gray-200">
          {isBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}
        </span>
      </button>

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file === undefined) return;
          setIsMenuOpen(false);
          void upload(file);
        }}
      />

      {isMenuOpen && (
        <div className="font-body absolute top-full left-0 z-10 mt-2 w-72 rounded-xl border border-gray-100 bg-white p-2 text-sm shadow-md">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => fileInput.current?.click()}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            <Camera className="h-4 w-4 text-gray-500" />
            {pictureUrl === undefined ? uploadLabel[locale] : replaceLabel[locale]}
          </button>
          {pictureUrl !== undefined && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setIsMenuOpen(false);
                void remove();
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {removeLabel[locale]}
            </button>
          )}
          <p className="m-0 px-3 pt-1 pb-2 text-xs leading-relaxed text-balance text-gray-500">
            {visibilityHint[locale]}
          </p>
        </div>
      )}

      {hasFailed && (
        <p className="font-body absolute top-full left-0 z-10 mt-2 w-72 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
          {failedText[locale]}
        </p>
      )}
    </div>
  );
};
