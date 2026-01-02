import type { ProxyModule } from '@/proxy/types';
import { NextResponse } from 'next/server';

export const serwistProxy: ProxyModule = (next) => {
  return async (request, _event, response) => {
    const { pathname } = request.nextUrl;

    if (pathname === '/sw.js' || pathname === '/sw.js.map') {
      const url = request.nextUrl.clone();
      url.pathname = `/serwist${pathname}`;
      return NextResponse.rewrite(url);
    }

    return next(request, _event, response);
  };
};
