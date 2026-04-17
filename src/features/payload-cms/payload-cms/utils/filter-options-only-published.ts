import type { FilterOptionsProps, Where } from 'payload';

export const filterOptionsOnlyPublished: ({
  req,
  relationTo,
}: FilterOptionsProps<unknown>) => Where | Promise<Where> = ({ relationTo }) => {
  if (
    [
      'images',
      'documents',
      'camp-map-annotations',
      'camp-schedule-entry',
      'forms',
      'users',
      'permissions',
    ].includes(relationTo as string)
  ) {
    // these collections do not have localized status
    return {};
  }

  return {
    _localized_status: {
      equals: {
        published: true,
      },
    },
  };
};
