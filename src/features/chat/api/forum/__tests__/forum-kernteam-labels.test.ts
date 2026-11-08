jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('payload', () => ({
  getPayload: (): Promise<unknown> =>
    Promise.resolve({
      find: ({ collection }: { collection: string }): Promise<unknown> =>
        Promise.resolve(
          collection === 'forum-topics'
            ? { docs: [{ chatUuid: 'platz', kernteamFunktionen: ['infra', 'praesidium'] }] }
            : {
                docs: [
                  { id: 'praesidium', label: { de: 'Präsidium', fr: 'Présidence' }, order: 1 },
                  { id: 'infra', label: { de: 'Ressortleitung Infrastruktur' }, order: 5 },
                  { id: 'koma', label: { de: 'Ressortleitung KOMA' }, order: 3 },
                ],
              },
        ),
    }),
}));

import { findKernteamLabelsOfTopic } from '@/features/chat/api/forum/forum-kernteam-labels';
import type { PrismaClientOrTransaction } from '@/types/types';

const prisma = {
  user: {
    findMany: (): Promise<unknown> =>
      Promise.resolve([
        { uuid: 'mira', funktionIds: ['koma', 'infra'] },
        { uuid: 'lia', funktionIds: ['infra', 'praesidium'] },
        { uuid: 'webteam', funktionIds: [] },
      ]),
  },
} as unknown as PrismaClientOrTransaction;

describe('the badge of the Kernteam', () => {
  it('names the function that makes someone Kernteam of the topic, not another one', async () => {
    const labels = await findKernteamLabelsOfTopic(prisma, 'platz', ['mira', 'webteam'], 'de');

    // Mira also leads KOMA, which is not a Kernteam function of this topic
    expect(labels.get('mira')).toBe('Ressortleitung Infrastruktur');
    // the owner without one keeps the plain "Kernteam"
    expect(labels.has('webteam')).toBe(false);
  });

  it('takes the first function in their order, in the reader’s language', async () => {
    const labels = await findKernteamLabelsOfTopic(prisma, 'platz', ['lia'], 'fr');

    expect(labels.get('lia')).toBe('Présidence');
  });
});
