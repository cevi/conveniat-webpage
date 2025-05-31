import type { Locale } from '@/types/types';
import type { Block, FilterOptionsProps, Where } from 'payload';

const findQuery: ({ req, relationTo }: FilterOptionsProps<unknown>) => Promise<Where> = async ({
  req,
  relationTo,
}) => {
  const { payload, locale } = req;

  const allItems = await payload.find({
    collection: relationTo,
    draft: false,
    locale: locale as Locale,
    limit: 10,
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

export const formBlock: Block = {
  slug: 'formBlock',
  interfaceName: 'FormBlock',

  imageURL: '/admin-block-images/form-block.png',
  imageAltText: 'Form block',

  fields: [
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'forms',
      required: true,
      hasMany: false,
      filterOptions: findQuery,
      validate: () => true,
    },
  ],
};
