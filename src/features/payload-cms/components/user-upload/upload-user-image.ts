'use server';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { StaticTranslationString } from '@/types/types';
import { auth } from '@/utils/auth';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import config from '@payload-config';
import fromBuffer from 'image-size';
import { randomUUID } from 'node:crypto';
import { getPayload } from 'payload';

interface UploadReturnType {
  error: boolean;
  message: string;
}

const notAuthenticatedError: StaticTranslationString = {
  en: 'Not authenticated.',
  de: 'Nicht angemeldet.',
  fr: 'Non authentifié.',
};

const notAnImageError: StaticTranslationString = {
  en: 'Not an image.',
  de: 'Kein Bild.',
  fr: "Pas d'image.",
};

const imageTooBig: StaticTranslationString = {
  en: 'Image too big (>10mb).',
  de: 'Bild zu gross (>10mb).',
  fr: 'Image trop grande (>10mb).',
};

export const checkImageDimensions = async (file: File): Promise<boolean> => {
  const buffer = Buffer.from(await file.arrayBuffer());
  const dimensions = fromBuffer(buffer);

  if (!dimensions.width || !dimensions.height) return false;

  return dimensions.width >= 1920 && dimensions.height >= 1080;
};

export const uploadUserImage = async (
  image: File,
  description: string,
): Promise<UploadReturnType> => {
  const payload = await getPayload({ config });
  const session = await auth();
  const locale = await getLocaleFromCookies();
  const hitobito_user = session?.user as HitobitoNextAuthUser;

  if (!session?.user) {
    return {
      error: true,
      message: notAuthenticatedError[locale],
    };
  }

  if (!image.type.startsWith('image')) {
    return {
      error: true,
      message: notAnImageError[locale],
    };
  }

  const imageDimensionCheck = await checkImageDimensions(image);
  if (!imageDimensionCheck) {
    return {
      error: true,
      message: imageTooBig[locale],
    };
  }

  const extension = image.name.split('.').at(-1) ?? '';
  await payload.create({
    collection: 'userSubmittedImages',
    data: {
      uploaded_by: hitobito_user.uuid,
      user_description: description,
      original_filename: image.name,
    },
    file: {
      data: Buffer.from(await image.arrayBuffer()),
      mimetype: image.type,
      name: randomUUID() + '.' + extension,
      size: 0,
    },
  });

  return {
    message: 'Ok',
    error: false,
  };
};
