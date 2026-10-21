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
 * The header of the user's own profile: their avatar next to `children`. A tap on the avatar
 * unfolds, in place below the header, what can be done with it: upload a photo, choose another
 * one, or remove it again. Nothing floats over the page, so on a phone it scrolls and reads like
 * the rest of the settings.
 */
export const ProfileAvatar: React.FC<{
  userId: string;
  name: string;
  pictureUrl: string | undefined;
  locale: Locale;
  children: React.ReactNode;
}> = ({ userId, name, pictureUrl: initialPictureUrl, locale, children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { pictureUrl, isBusy, hasFailed, upload, remove } = useProfilePicture(initialPictureUrl);

  return (
    <div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-expanded={isMenuOpen}
          aria-controls="profile-picture-actions"
          aria-label={avatarLabel[locale]}
          className="relative block shrink-0 cursor-pointer rounded-full"
        >
          <PersonAvatar
            seed={userId}
            name={name}
            pictureUrl={pictureUrl}
            className="h-14 w-14 text-lg"
          />
          <span className="ring-line absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-green-700 ring-1">
            {isBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
          </span>
        </button>
        {children}
      </div>

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
        <div
          id="profile-picture-actions"
          className="bg-quiet mt-4 rounded-[14px] p-1.5 text-[15px]"
        >
          <button
            type="button"
            disabled={isBusy}
            onClick={() => fileInput.current?.click()}
            className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left font-semibold text-green-900 hover:bg-white disabled:opacity-50"
          >
            <Camera className="h-5 w-5 text-green-700" aria-hidden="true" />
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
              className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left font-semibold text-green-900 hover:bg-white disabled:opacity-50"
            >
              <Trash2 className="h-5 w-5 text-green-700" aria-hidden="true" />
              {removeLabel[locale]}
            </button>
          )}
          <p className="m-0 px-3 pt-1 pb-2 text-[13px] leading-relaxed text-green-700">
            {visibilityHint[locale]}
          </p>
        </div>
      )}

      {hasFailed && (
        <p className="bg-quiet mt-4 rounded-[14px] p-3 text-[13px] font-medium text-green-900">
          {failedText[locale]}
        </p>
      )}
    </div>
  );
};
