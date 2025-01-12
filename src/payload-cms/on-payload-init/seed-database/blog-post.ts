import { Blog } from "@/payload-types";

export const basicBlog = (imageID: any): Blog => {
    return {
        id: '6783df844eb8bebdce04d1b8',
        _locale: 'de' as const,
        content: {
            releaseDate: '2025-01-01T01:00:00.000Z',
            blogH1: 'Hallo und Willkommen!',
            blogShortTitle: 'Titel',
            bannerImage: imageID,
            mainContent: [{
                blockType: 'richTextSection',
                blockName: 'text',
                richTextSection: {
                    root: {
                        children: [{
                            id: '6783df844eb8bebdce04d1c9',
                            text: 'Random Blog Content!',
                            type: 'text',
                            version: 1,
                        }],
                        direction: 'ltr' as const,
                        format: 'start' as const,
                        indent: 0,
                        type: 'paragraph',
                        version: 1,
                    },
                }
            },],
            blogSearchKeywords: "blog",
        },
        seo: {
            urlSlug: 'blog1-de'
        },
        createdAt: '2025-01-01T01:00:00.000Z',
        updatedAt: '2025-01-01T01:00:00.000Z',
        _localized_status: {
            published: true,
        },
    }
}