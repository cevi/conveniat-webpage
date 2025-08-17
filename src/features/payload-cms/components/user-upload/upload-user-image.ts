'use server';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { StaticTranslationString } from '@/types/types';
import { auth } from '@/utils/auth-helpers';
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
  en: 'Not authenticaed.',
  de: 'Nicht angemeldet.',
  fr: 'Non authentifié.',
};

export const checkImageDimensions = async (file: File): Promise<boolean> => {
  const buffer = Buffer.from(await file.arrayBuffer());
  const dimensions = fromBuffer(buffer);

  if (!dimensions.width || !dimensions.height) return false;

  return dimensions.width >= 1920 && dimensions.height >= 1080;
};

export const uploadUserImage = async (
  images: File[],
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

  const filenameAllowed = images.filter((image) => image.type.startsWith('image/'));

  const results = await Promise.all(
    filenameAllowed.map(async (image) => {
      const isValid = await checkImageDimensions(image);
      return { image, isValid };
    }),
  );
  const allowedImages = results.filter((r) => r.isValid).map((r) => r.image);

  await Promise.all(
    allowedImages.map(async (image) => {
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
    }),
  );

  return {
    message: 'Ok',
    error: false,
  };
};
