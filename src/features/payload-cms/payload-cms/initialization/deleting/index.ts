import type { CollectionSlug, Payload } from 'payload';

export const deleteDatabase = async (payload: Payload): Promise<void> => {
  const slugs_to_delete: CollectionSlug[] = [
    'generic-page',
    'blog',
    'forms',
    'documents',
    'form-submissions',
    'images',
    'permissions',
    'push-notification-subscriptions',
    'search-collection',
    'timeline',
    'timelineCategory',
    'users',
    'go',
  ];

  for (const slug of slugs_to_delete) {
    await payload.delete({
      collection: slug,
      where: { id: { exists: true } },
    });
  }
};
