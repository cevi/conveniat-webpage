import { fakerDE as faker } from '@faker-js/faker';
import type { Payload } from 'payload';

export const createRandomUser = async (payload: Payload): Promise<string> => {
  const { id: userId } = await payload.create({
    collection: 'users',
    data: {
      fullName: faker.person.fullName(),
      email: faker.internet.email(),
      nickname: faker.person.firstName(),
      adminPanelAccess: false,
      groups: [],
      cevi_db_uuid: faker.number.int({ min: 100_000, max: 999_999 }),
    },
  });
  return userId;
};
