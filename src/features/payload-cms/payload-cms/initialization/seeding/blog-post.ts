import { generateRichTextSection } from '@/features/payload-cms/payload-cms/initialization/seeding/placeholder-lexical';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Blog } from '@/features/payload-cms/payload-types';
import { fakerDE as faker } from '@faker-js/faker';

export const basicBlog = (
  bannerImage: string,
  imageIds: string[],
  public_permission_id: string,
): Blog => {
  const slug = faker.lorem.slug();

  return {
    id: '6783df844eb8bebdce04d1b8',
    _locale: LOCALE.DE,
    internalPageName: slug,
    authors: [],
    internalStatus: faker.helpers.arrayElement(['draft', 'review', 'approved', 'archived']) as
      | 'draft'
      | 'review'
      | 'approved'
      | 'archived',
    content: {
      releaseDate: '2025-01-01T01:00:00.000Z',
      blogH1: faker.lorem.sentence(),
      blogShortTitle: faker.lorem.sentence(),
      permissions: public_permission_id,
      bannerImage: bannerImage,
      mainContent: [
        {
          blockType: 'richTextSection' as const,
          richTextSection: generateRichTextSection(),
        },
        {
          blockType: 'photoCarousel',
          images: imageIds,
          id: '679cd696d513ff58014d2144',
        },
      ],
    },
    seo: {
      urlSlug: slug,
    },
    createdAt: '2025-01-01T01:00:00.000Z',
    updatedAt: '2025-01-01T01:00:00.000Z',
    _localized_status: {
      published: true,
    },
    _status: 'published',
  };
};
