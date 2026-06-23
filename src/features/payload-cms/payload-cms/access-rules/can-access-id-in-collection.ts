import { hasPermissions } from '@/utils/has-permissions';
import { withSpan } from '@/utils/tracing-helpers';
import type { Access } from 'payload';

export const canAccessDocuments: Access = async ({ req }) => {
  return await withSpan('canAccessDocuments', async () => {
    const { payload } = req;

    let allowedPermissionIds: string[] = [];
    try {
      // Fetch all available permission profiles.
      // There are usually very few of these compared to the total number of documents.
      const allPermissions = await payload.find({
        collection: 'permissions',
        pagination: false,
        limit: 0, // Get all
        draft: false,
        req, // Pass the request to maintain auth context
      });

      // Fetch the session ONCE to avoid redundant auth() calls in the loop
      const { getCachedSession } = await import('@/utils/auth');
      const userSession = await getCachedSession();

      const results = await Promise.all(
        allPermissions.docs.map(async (permission) => {
          const isAllowed = await hasPermissions(permission, userSession);
          return isAllowed ? permission.id : undefined;
        }),
      );
      // Check which permission profiles the currently authenticated user is allowed to access
      allowedPermissionIds = results.filter((id): id is string => id !== undefined);
    } catch (error) {
      if (error instanceof Error && error.name === 'MongoNotConnectedError') {
        payload.logger.warn('MongoDB not connected yet. Proceeding with public access rules.');
      } else {
        payload.logger.error({ err: error }, 'Failed to fetch permissions during access check:');
      }
    }

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
