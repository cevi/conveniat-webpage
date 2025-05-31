import { generateRichTextSection } from '@/features/payload-cms/payload-cms/initialization/seeding/placeholder-lexical';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Timeline } from '@/features/payload-cms/payload-types';
import { fakerDE as faker } from '@faker-js/faker';

export const basicTimelineObject: Timeline = {
  id: '6783e3524eb8bebdce04d3dd',
  internalPageName: 'news-entry',
  internalStatus: 'approved',
  authors: [],
  _localized_status: {
    published: true,
  },
  date: '2025-01-12T12:00:00.000Z',
  title: faker.lorem.sentence({ min: 3, max: 5 }),
  mainContent: [
    {
      blockType: 'richTextSection' as const,
      richTextSection: generateRichTextSection(),
    },
  ],
  _status: 'published',
  createdAt: '2025-01-12T15:44:18.621Z',
  updatedAt: '2025-01-12T15:44:22.745Z',
  _locale: LOCALE.DE,
};
