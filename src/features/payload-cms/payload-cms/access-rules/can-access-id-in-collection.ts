import type { Permission } from '@/features/payload-cms/payload-types';
import { hasPermissions } from '@/utils/has-permissions';
import type { Access } from 'payload';

export const canAccessDocuments: Access = async ({ req }) => {
  const { payload } = req;
  const allDocuments = await payload.find({
    collection: 'documents',
    draft: false,
    req,
  });

  const filteredArticles = await Promise.all(
    allDocuments.docs.map(
      async (document_) => await hasPermissions(document_.permissions as Permission),
    ),
  );
  const permittedDocuments = allDocuments.docs.filter(
    (_, index) => filteredArticles[index] ?? false,
  );

  const allIds = permittedDocuments.map((item) => item.id);

  return {
    id: {
      in: allIds,
    },
  };
};
