import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import prisma from '@/lib/database';
import { fakerDE as faker } from '@faker-js/faker';
import type { Payload } from 'payload';

export const seedPushNotifications = async (payload: Payload, userIds: string[]): Promise<void> => {
  console.log('Seeding: Creating push notification subscriptions and logs...');

  if (userIds.length === 0) {
    console.warn('Seeding: No users provided for push notification seeding.');
    return;
  }

  // Use the first user for a test subscription
  const testUserId = userIds[0] as string;

  // 1. Create a test subscription in Payload
  await payload.create({
    collection: 'push-notification-subscriptions',
    data: {
      user: testUserId,
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-placeholder',
      // eslint-disable-next-line unicorn/no-null
      expirationTime: null,
      keys: {
        p256dh: 'BAs-test-p256dh-key-placeholder-value-exactly-sixty-five-bytes-long',
        auth: 'test-auth-key-placeholder',
      },
    },
    locale: LOCALE.DE,
    context: { disableRevalidation: true },
  });

  // 2. Create several test logs in Prisma for each user
  const logData = [];
  for (const userId of userIds) {
    const numberLogs = faker.number.int({ min: 2, max: 8 });
    for (let index = 0; index < numberLogs; index++) {
      const sentAt = faker.date.recent({ days: 30 });
      const deliveredAt = faker.helpers.maybe(
        () => new Date(sentAt.getTime() + faker.number.int({ min: 1000, max: 60_000 })),
        { probability: 0.9 },
      );
      const interactedAt = deliveredAt
        ? faker.helpers.maybe(
            () => new Date(deliveredAt.getTime() + faker.number.int({ min: 5000, max: 3_600_000 })),
            { probability: 0.3 },
          )
        : undefined;

      logData.push({
        userId,
        content: faker.lorem.sentence(),
        sentAt,
        // eslint-disable-next-line unicorn/no-null
        deliveredAt: deliveredAt ?? null,
        // eslint-disable-next-line unicorn/no-null
        interactedAt: interactedAt ?? null,
        // eslint-disable-next-line unicorn/no-null
        interactionType: interactedAt ? faker.helpers.arrayElement(['OPEN', 'DISMISS']) : null,
        userAgent: faker.internet.userAgent(),
      });
    }
  }

  await prisma.pushNotificationLog.createMany({
    data: logData,
  });

  console.log(`Seeding: Created ${logData.length} push notification logs.`);
};
