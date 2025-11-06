import type { NextMiddlewareResult } from 'next/dist/server/web/types';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export type ChainedMiddleware = (
  request: NextRequest,
  event: NextFetchEvent,
  response: NextResponse | undefined,
) => NextMiddlewareResult | Promise<NextMiddlewareResult>;

type MiddlewareFactory = (middleware: ChainedMiddleware) => ChainedMiddleware;

/**
 *
 * Creates a middleware chain from an array of middleware factories.
 * Tracks and logs the performance of each middleware in the chain.
 *
 * @param functions
 * @param index
 */
export function middlewareChain(functions: MiddlewareFactory[], index = 0): ChainedMiddleware {
  const current = functions[index];

  if (current) {
    const next = middlewareChain(functions, index + 1);
    return current(next);
  }

  return (_request: NextRequest, _event: NextFetchEvent, response: NextResponse | undefined) => {
    return response ?? NextResponse.next();
  };
}
