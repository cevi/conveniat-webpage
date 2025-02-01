import { Blog } from '@/payload-types';
import { LOCALE } from '@/payload-cms/locales';
import { generateRichTextSection } from '@/payload-cms/on-payload-init/seed-database/placeholder-lexical';
import { fakerDE as faker } from '@faker-js/faker';

export const basicBlog = (bannerImage: string, imageIds: string[]): Blog => {
  const slug = faker.lorem.slug();

  return {
    id: '6783df844eb8bebdce04d1b8',
    _locale: LOCALE.DE,
    internalPageName: slug,
    content: {
      releaseDate: '2025-01-01T01:00:00.000Z',
      blogH1: faker.lorem.sentence(),
      blogShortTitle: faker.lorem.sentence(),
      bannerImage: bannerImage,
      mainContent: [
        {
          blockType: 'richTextSection',
          blockName: 'text',
          richTextSection: {
            root: {
              children: [
                {
                  id: '6783df844eb8bebdce04d1c9',
                  text: faker.lorem.paragraph(),
                  type: 'text',
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: 'start' as const,
              indent: 0,
              type: 'paragraph',
              version: 1,
            },
          },
        },
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
