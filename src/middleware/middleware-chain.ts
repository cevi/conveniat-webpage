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
 * based on https://medium.com/@0xTanzim/implementing-multiple-middleware-in-next-js-combining-nextauth-and-internationalization-28d5435d3187
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
