import type { CollectionConfig } from 'payload';

export const SmtpBounceMailTracking: CollectionConfig = {
  slug: 'smtp-bounce-mail-tracking',
  admin: {
    hidden: true,
    useAsTitle: 'uid',
  },
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'uid',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'failureCount',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
    {
      name: 'lastAttempt',
      type: 'date',
      required: true,
    },
  ],
};
