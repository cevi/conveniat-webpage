'use client';

import { PersonAvatar } from '@/components/ui/person-avatar';
import { ImageViewer } from '@/features/chat/components/chat-view/message/image-viewer';
import { useImageViewerHistory } from '@/features/chat/hooks/use-image-viewer-history';
import type { Locale, StaticTranslationString } from '@/types/types';
import { largeProfilePictureUrl } from '@/utils/profile-picture-url';
import type React from 'react';

const openPictureText: StaticTranslationString = {
  de: 'Profilbild von {name} öffnen',
  en: "Open {name}'s profile picture",
  fr: 'Ouvrir la photo de profil de {name}',
};

const pictureOfText: StaticTranslationString = {
  de: 'Profilbild von {name}',
  en: "{name}'s profile picture",
  fr: 'Photo de profil de {name}',
};

const avatarClassName = 'h-[72px] w-[72px] text-2xl';

/**
 * The other person of a private chat at the head of its details. With a profile picture, a tap
 * opens it full screen at 640 pixels, the way WhatsApp does, and the back gesture closes it. A
 * picture stored before that size, or one offline and not yet loaded, shows as the avatar.
 * Without one it is their initials, and nothing to open.
 */
export const PartnerPicture: React.FC<{
  id: string;
  name: string;
  pictureUrl: string | undefined;
  locale: Locale;
}> = ({ id, name, pictureUrl, locale }) => {
  // a cache from an older release may hold an empty URL
  const hasPicture = pictureUrl !== undefined && pictureUrl !== '';
  const largeUrl = hasPicture ? largeProfilePictureUrl(pictureUrl) : '';
  const viewer = useImageViewerHistory(largeUrl);

  if (!hasPicture) {
    return (
      <PersonAvatar seed={id} name={name} pictureUrl={undefined} className={avatarClassName} />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={viewer.open}
        aria-label={openPictureText[locale].replace('{name}', name)}
        className="focus-visible:focus-ring cursor-zoom-in rounded-full"
      >
        <PersonAvatar seed={id} name={name} pictureUrl={pictureUrl} className={avatarClassName} />
      </button>
      {viewer.isOpen && (
        <ImageViewer
          src={largeUrl}
          alt={pictureOfText[locale].replace('{name}', name)}
          caption={name}
          fallbackSrc={pictureUrl}
          locale={locale}
          onClose={viewer.close}
        />
      )}
    </>
  );
};
