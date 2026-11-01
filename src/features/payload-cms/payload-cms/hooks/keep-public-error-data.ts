import type { AfterErrorHook } from 'payload';

/**
 * Hands the details of a public `APIError` thrown by our own code to the client.
 *
 * Payload copies an error's `data` into the response only when the error is `instanceof` its
 * `APIError`. In the production build that check fails for an error thrown from our hooks, so
 * the response keeps only the message (seen on prod with 1.44.0): the form showed a bare
 * "Validation Error" and could neither mark the fields the server rejected nor open their step.
 * Development serves Payload unbundled, where the check holds and this returns what Payload
 * would have answered anyway.
 *
 * Only a public error is answered: Payload replaces every other one with a generic message,
 * and its data must not reach the client either.
 *
 * @param args - the error and the request it answers
 * @returns the response with the error's data, or nothing for every other error
 */
export const keepPublicErrorData: AfterErrorHook = ({ error }) => {
  if (error.name !== 'APIError') return;
  if (!('isPublic' in error) || error.isPublic !== true) return;
  if (!('data' in error) || typeof error.data !== 'object' || error.data === null) return;
  // Payload types `data` as a record, but hands an array of field errors through just the same.
  const data = error.data as Record<string, unknown>;
  return { response: { errors: [{ name: error.name, data, message: error.message }] } };
};
