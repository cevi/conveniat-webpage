import type { Blog } from '@/payload-types';
import { LOCALE } from '@/payload-cms/locales';
import { generateRichTextSection } from '@/payload-cms/initialization/seeding/placeholder-lexical';
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
      blogSearchKeywords: 'blog',
    },
    seo: {
      urlSlug: slug,
    },
    createdAt: '2025-01-01T01:00:00.000Z',
    updatedAt: '2025-01-01T01:00:00.000Z',
    _localized_status: {
      published: true,
    },
  };
};
