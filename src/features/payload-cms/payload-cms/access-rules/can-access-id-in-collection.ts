import { hasPermissions } from '@/utils/has-permissions';
import { withSpan } from '@/utils/tracing-helpers';
import type { Access } from 'payload';

export const canAccessDocuments: Access = async ({ req }) => {
  return await withSpan('canAccessDocuments', async () => {
    const { payload } = req;

    // Fetch all available permission profiles.
    // There are usually very few of these compared to the total number of documents.
    const allPermissions = await payload.find({
      collection: 'permissions',
      pagination: false,
      limit: 0, // Get all
      draft: false,
      req, // Pass the request to maintain auth context
    });

    // Check which permission profiles the currently authenticated user is allowed to access
    const allowedPermissionIds: string[] = [];

    // Fetch the session ONCE to avoid redundant auth() calls in the loop
    const { auth } = await import('@/utils/auth');
    const userSession = await auth();

    await Promise.all(
      allPermissions.docs.map(async (permission) => {
        // Evaluate the permission strictly based on the permission profile and user context
        const isAllowed = await hasPermissions(permission, userSession);
        if (isAllowed) {
          allowedPermissionIds.push(permission.id);
        }
      }),
    );

    // Return a query constraint that filters documents at the database level.
    // A document is accessible if:
    // 1. It has NO permission explicitly set (exists: false or equals: null, which is public by default according to `hasPermissions`)
    // 2. Its explicit permission is in the list of permissions the user is allowed to access
    return {
      or: [
        {
          permissions: {
            exists: false,
          },
        },
        {
          permissions: {
            // eslint-disable-next-line unicorn/no-null
            equals: null,
          },
        },
        {
          permissions: {
            in: allowedPermissionIds,
          },
        },
      ],
    };
  });
};
