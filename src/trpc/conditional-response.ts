/** The tag without the weak marker, `W/"abc"` → `"abc"`. */
const opaqueTag = (tag: string): string => tag.trim().replace(/^W\//, '');

/**
 * Whether an `If-None-Match` header names the entity tag. Compared weakly, as RFC 9110 asks for
 * a GET: a proxy that compresses the body marks the tag it passes on as weak.
 */
const matchesEntityTag = (ifNoneMatch: string | null, entityTag: string): boolean => {
  if (ifNoneMatch === null) return false;
  return ifNoneMatch
    .split(',')
    .some((tag) => tag.trim() === '*' || opaqueTag(tag) === opaqueTag(entityTag));
};

/**
 * Gives a successful query answer an entity tag, and answers a client that holds that very
 * answer with a bodiless 304.
 *
 * Screens poll the programme and the camp map every two minutes (`query-client.ts`), and those
 * answers weigh around a hundred kilobytes on camp wifi while they change a few times a day. The
 * browser stores the answer and revalidates it on its own, so the tRPC client still receives the
 * full body. `private` keeps it out of shared caches, because many answers belong to one user,
 * and a tag is the hash of the body, so a stored answer is only reused for the identical one.
 * @param request the request the answer is for
 * @param response the answer of the tRPC handler
 * @returns the answer with an entity tag, or a 304 when the client holds it already
 */
export const withEntityTag = async (request: Request, response: Response): Promise<Response> => {
  // mutations are POSTs, and a failed or partly failed batch is not worth keeping
  if (request.method !== 'GET' || response.status !== 200) return response;

  const body = await response.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', body);
  const entityTag = `"${Buffer.from(digest).toString('base64url')}"`;

  const headers = new Headers(response.headers);
  headers.set('ETag', entityTag);
  headers.set('Cache-Control', 'private, no-cache');

  if (matchesEntityTag(request.headers.get('if-none-match'), entityTag)) {
    headers.delete('Content-Length');
    // eslint-disable-next-line unicorn/no-null -- a 304 has no body
    return new Response(null, { status: 304, headers });
  }
  return new Response(body, { status: 200, headers });
};
