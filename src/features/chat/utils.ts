/**
 * Generates a unique message ID for optimistic frontend state updates.
 */
export const generateOptimisticId = (): string => {
  return `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

/**
 * Validates if a cached message matches either a specific optimistic ID or the general optimistic prefix.
 */
export const isOptimisticMessageMatch = (itemId: string, optimisticId?: string): boolean => {
  return typeof optimisticId === 'string'
    ? itemId === optimisticId
    : itemId.startsWith('optimistic-');
};
