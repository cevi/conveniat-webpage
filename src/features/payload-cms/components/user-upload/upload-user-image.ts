'use server';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';
import config from '@payload-config';
import { getPayload } from 'payload';

interface UploadReturnType {
  error: boolean;
  message: string;
}

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
      message: 'not authenticated.',
    };
  }

  await Promise.all(
    images.map(async (image) => {
      await payload.create({
        collection: 'userSubmittedImages',
        data: {
          uploaded_by: hitobito_user.uuid,
          user_description: description,
        },
        file: {
          data: Buffer.from(await image.arrayBuffer()),
          mimetype: image.type, // TODO
          name: image.name,
          size: 0,
        },
      });
    }),
  );

  return {
    message: 'ok',
    error: false,
  };
};
