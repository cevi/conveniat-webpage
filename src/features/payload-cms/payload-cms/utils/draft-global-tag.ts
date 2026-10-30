/**
 * The cache tag of a cached read of a global's draft. Draft saves expire it and nothing else, so
 * the published global stays cached while an editor types.
 *
 * @param slug the slug of the global
 */
export const draftGlobalTag = (slug: string): string => `global:${slug}:draft`;
