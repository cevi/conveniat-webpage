import type { NextFetchEvent, NextRequest, NextResponse } from 'next/server';

/**
 * A proxy response can be either a NextResponse or a standard Response.
 *
 */

export type ProxyResponse = NextResponse | Response;
/**
 * A proxy is a middleware function that takes a NextRequest, NextFetchEvent, and NextResponse,
 * and returns a ProxyResponse (NextResponse or Response) or a Promise that resolves to a ProxyResponse.
 *
 * @example
 * const myProxy: Proxy = async (request, event, response) => {
 *    // Modify the response as needed
 *    return response;
 * };
 */
export type Proxy = (
  request: NextRequest,
  event: NextFetchEvent,
  response: NextResponse,
) => ProxyResponse | Promise<ProxyResponse>;

/**
 * A proxy module is a function that takes a Proxy (middleware) and returns a new Proxy.
 * This allows for composing multiple proxies together.
 *
 * @example
 * const myProxyModule: ProxyModule = (next) => async (request, event, response) => {
 *    // Do something before
 *    const modifiedResponse = await next(request, event, response);
 *    // Do something after
 *    return modifiedResponse;
 * };
 *
 * Proxy modules can be chained together to create complex middleware behavior.
 * This can be done using the `proxyChain` function.
 *
 * Proxy modules can abort the chain by returning a response directly without calling `next`.
 * This is useful for handling specific conditions or errors.
 *
 */
export type ProxyModule = (middleware: Proxy) => Proxy;
