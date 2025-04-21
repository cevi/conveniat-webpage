import type { CollectionConfig } from 'payload';

export const asPushNotificationCollection = (config: CollectionConfig): CollectionConfig => {
  return {
    ...config,
    defaultPopulate: {
      ...config.defaultPopulate,
      versions: false,
    },
    fields: [
      {
        name: '_sendPushNotification',
        type: 'ui',
        admin: {
          components: {
            Field: '@/payload-cms/components/push-notification/push-notification',
          },
          disableListColumn: true,
        },
      },
      ...config.fields,
    ],
  };
};
