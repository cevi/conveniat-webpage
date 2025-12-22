import type { Proxy, ProxyModule } from '@/proxy/types';
import { NextResponse } from 'next/server';

/**
 *
 * Creates a proxy chain from an array of proxy factories.
 *
 * The proxies are applied as follows:
 * [proxy_0, proxy_1, ..., proxy_n] is applied as
 *      proxy_n( ... proxy_1( proxy_0(request) ) ... )
 *
 * Each proxy in the chain can modify the response, the request is invariant.
 * The final response will contain an 'x-proxy-chain' header listing all
 * proxies that were applied.
 *
 * @example
 * const chainedProxy = proxyChain([
 *   {proxy: proxyModuleA, name: 'proxyA'},
 *   {proxy: proxyModuleB, name: 'proxyB'},
 *   {proxy: proxyModuleC, name: 'proxyC'},
 * ]);
 *
 * @param proxies - An array of proxy modules with their names
 * @returns A single Proxy that represents the chained proxies
 */
export const proxyChain = (proxies: { proxy: ProxyModule; name: string }[]): Proxy =>
  proxies.reduceRight<Proxy>(
    (nextMiddleware, { proxy, name }) => {
      const chainedProxy = proxy(nextMiddleware);

      return async (request, event, response: NextResponse | undefined) => {
        response ??= NextResponse.next();

        const existingHeader = response.headers.get('x-proxy-chain');
        const newHeader = existingHeader === null ? name : `${existingHeader}, ${name}`;
        response.headers.set('x-proxy-chain', newHeader);

        return chainedProxy(request, event, response);
      };
    },
    (_request, _event, response: NextResponse) => {
      return response;
    },
  );
