import type { FilterOptionsProps, Where } from 'payload';

export const filterOptionsOnlyPublished: ({
  relationTo,
  req,
}: FilterOptionsProps<unknown>) => Where | Promise<Where> = async ({ relationTo, req }) => {
  if (
    [
      'images',
      'documents',
      'camp-map-annotations',
      'camp-schedule-entry',
      'forms',
      'users',
      'permissions',
    ].includes(relationTo)
  ) {
    // these collections do not have localized status
    return {};
  }

  if (relationTo === 'generic-page' || relationTo === 'blog') {
    const locale = req.locale ?? 'en';
    const result = await req.payload.find({
      collection: relationTo,
      depth: 0,
      pagination: false,
      draft: false,
      locale,
      where: {
        _localized_status: {
          equals: {
            published: true,
          },
        },
      },
    });

    const publishedIds = result.docs.map((document) => document.id);

    if (publishedIds.length === 0) {
      return {
        id: {
          equals: '__no_published_docs__',
        },
      };
    }

    return {
      id: {
        in: publishedIds,
      },
    };
  }

  return {
    _localized_status: {
      equals: {
        published: true,
      },
    },
  };
};
