import type { Locale } from '@/types/types';
import type { FilterOptionsProps, Where } from 'payload';

export const filterOptionsOnlyPublished: ({
  req,
  relationTo,
}: FilterOptionsProps<unknown>) => Promise<Where> = async ({ req, relationTo }) => {
  const { payload, locale } = req;

  const allItems = await payload.find({
    collection: relationTo,
    draft: false,
    locale: locale as Locale,
    limit: 20,
    where: {
      _localized_status: {
        equals: {
          published: true,
        },
      },
    },
    req,
  });
  const allIds = allItems.docs.map((item) => item.id);
  return {
    id: {
      in: allIds,
    },
  };
};
