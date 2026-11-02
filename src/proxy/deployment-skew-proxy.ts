import { deploymentId } from '@/deployment-id';
import type { ProxyModule } from '@/proxy/types';
import { createLogger } from '@/utils/server-logger';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const logger = createLogger('proxy:deployment-skew');

/**
 * Whether `request` is a Flight request of a page of another build: a navigation, prefetch or
 * refresh whose `x-deployment-id` names a build other than this one.
 *
 * The router sends `x-deployment-id` only with its own requests, and Next.js strips the `RSC`
 * header and the `_rsc` parameter before the proxy runs, so the id is what marks a Flight request
 * here. A request without one comes from a page that predates deployment ids, or from the browser
 * itself, and is left alone. So is a Server Function call (`next-action`): it may carry a form
 * submission, and turning it away would lose it.
 */
export const isFlightRequestOfAnotherBuild = (request: NextRequest): boolean => {
  const theirs = request.headers.get('x-deployment-id');
  if (theirs === null || theirs === deploymentId) return false;
  return !request.headers.has('next-action');
};

/**
 * Turns away a Flight request from a page of another build with an empty 409, before anything
 * renders.
 *
 * While a release rolls, nginx sends each request to either build. The router compares the build
 * of a Flight response only after decoding it, and decoding already loads the chunks of every
 * client component it names. A prefetch answered by the other build is then dropped, but its
 * chunks have run: Turbopack keeps the first module factory registered under an id, so the page
 * keeps the other build's code for those modules and fails later, after the rollout, with a
 * plain TypeError (e.g. `(0 , s.f) is not a function`) when it renders one of them.
 *
 * A non-OK answer is never decoded. The router turns a navigation into a full page load and drops
 * a prefetch. The body is empty but present: without one the router takes the answer for a
 * failed fetch and, with `useOffline`, parks the navigation until the connection returns.
 */
export const deploymentSkewProxy: ProxyModule = (next) => {
  return async (request, event, response) => {
    if (isFlightRequestOfAnotherBuild(request)) {
      logger.debug('Turning away a Flight request of another build', {
        'deployment.id': deploymentId,
        'deployment.client_id': request.headers.get('x-deployment-id') ?? '',
      });
      return new NextResponse('', { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }
    return next(request, event, response);
  };
};
