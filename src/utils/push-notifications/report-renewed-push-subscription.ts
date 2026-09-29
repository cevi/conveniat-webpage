/**
 * Tells the server that `oldSubscription` was replaced by `newSubscription`, so pushes for the
 * stored row go to the new endpoint.
 *
 * A plain fetch instead of the tRPC client because the service worker calls it too, where
 * the client does not exist. It needs no session: the old subscription's auth secret is what
 * proves the caller owns the row.
 */
export const reportRenewedPushSubscription = async (
  oldSubscription: PushSubscriptionJSON,
  newSubscription: PushSubscriptionJSON,
): Promise<void> => {
  const response = await fetch('/api/trpc/pushTracking.renewWebPushSubscription?batch=1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 0: { json: { oldSubscription, newSubscription } } }),
  });
  if (!response.ok) {
    throw new Error(`Renewing the push subscription failed with status ${response.status}`);
  }
};
