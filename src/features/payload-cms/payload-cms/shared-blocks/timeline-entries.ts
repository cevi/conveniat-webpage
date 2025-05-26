import type { Block } from 'payload';

export const timelineEntries: Block = {
  slug: 'timelineEntries',
  interfaceName: 'timelineEntries',

  imageURL: '/admin-block-images/timeline-entries-block.png',
  imageAltText: 'Timeline Entries Block Post',

  fields: [
    {
      name: 'timelineEntryCategories',
      relationTo: 'timelineCategory',
      admin: {
        appearance: 'select',
      },
      type: 'relationship',
      hasMany: true,
    },
  ],
};
