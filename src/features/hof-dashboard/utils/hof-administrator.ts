import { HOF_ADMINISTRATOR_ROLE_CLASS } from '@/features/hof-dashboard/constants';

/** One role of a user, as the login copies it from the Cevi.DB profile onto the Payload user. */
export interface CeviDatabaseRole {
  id?: number | null;
  role_class?: string | null;
}

/**
 * The Cevi.DB groups a user administers, as text, the way a Hof stores its `groupId`.
 *
 * Only the address administrator role counts: a leader or member of the same group is a
 * participant of the Hof, not the person who hands in its plans.
 */
export const getAdministeredGroupIds = (
  roles: readonly CeviDatabaseRole[] | null | undefined,
): string[] => {
  const groupIds = new Set<string>();
  for (const role of roles ?? []) {
    if (role.role_class !== HOF_ADMINISTRATOR_ROLE_CLASS) continue;
    if (typeof role.id !== 'number' || !Number.isInteger(role.id) || role.id <= 0) continue;
    groupIds.add(String(role.id));
  }
  return [...groupIds];
};
