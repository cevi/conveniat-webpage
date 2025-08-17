'use server';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { StaticTranslationString } from '@/types/types';
import { auth } from '@/utils/auth-helpers';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import config from '@payload-config';
import { randomUUID } from 'crypto';
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

const checkImageDimensions = (file: File): Promise<File | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (img.width >= 1920 && img.height >= 1080) {
          resolve(file);
        } else {
          resolve(null);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
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

  const allowedImages = await Promise.all(
    images
      .filter(async (image) => await checkImageDimensions(image))
      .filter((image) => image.type.startsWith('image/')),
  );

  await Promise.all(
    allowedImages.map(async (image) => {
      const extension = image.name.split('.').slice(-1)[0];
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
