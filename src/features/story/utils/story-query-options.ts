/**
 * How the story's queries stay current. Parts of the story appear at their `visibleFrom` and a
 * challenge ends at its `until`, while nothing on the client changes: so a story screen asks again
 * every five minutes while it is open, and when the app comes back to the front. What an answer
 * may hold is still decided by the server alone.
 */
export const storyQueryOptions = {
  staleTime: 60 * 1000,
  refetchInterval: 5 * 60 * 1000,
  refetchOnWindowFocus: true,
} as const;
