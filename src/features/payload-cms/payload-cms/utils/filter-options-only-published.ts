import type { Locale } from '@/types/types';
import type { FilterOptionsProps, Where } from 'payload';

export const filterOptionsOnlyPublished: ({
  req,
  relationTo,
}: FilterOptionsProps<unknown>) => Promise<Where> = async ({ req, relationTo }) => {
  const { payload, locale } = req;

  if (['images', 'documents', 'camp-map-annotations', 'camp-schedule-entry'].includes(relationTo)) {
    // these collections do not have localized status
    return {};
  }

  try {
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
  } catch (error) {
    console.error(
      'Error fetching published items for filter options with relationTo:',
      relationTo,
      error,
    );
    return {};
  }
};
