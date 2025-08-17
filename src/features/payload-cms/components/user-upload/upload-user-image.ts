'use server';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';
import config from '@payload-config';
import { getPayload } from 'payload';

interface UploadReturnType {
  error: boolean;
  message: string;
}

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
  const hitobito_user = session?.user as HitobitoNextAuthUser;

  if (!session?.user) {
    return {
      error: true,
      message: 'Not authenticated.',
    };
  }

  const allowedImages = await Promise.all(
    images
      .filter(async (image) => await checkImageDimensions(image))
      .filter((image) => image.type.startsWith('image/')),
  );

  await Promise.all(
    allowedImages.map(async (image) => {
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
          name: 'user_upload_' + image.name,
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
