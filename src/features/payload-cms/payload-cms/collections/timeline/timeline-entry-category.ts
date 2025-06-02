import type { CollectionConfig } from 'payload';

export const TimelineEntryCategory: CollectionConfig = {
  slug: 'timelineCategory',

  admin: {
    useAsTitle: 'name',
  },

  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'text',
    },
    {
      name: 'relatedTimelineEntries',
      type: 'join',
      collection: 'timeline',
      on: 'categories',
    },
  ],
};
