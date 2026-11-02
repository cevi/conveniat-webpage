import { deploymentSkewProxy } from '@/proxy/deployment-skew-proxy';
import type { NextFetchEvent } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';

jest.mock('@/deployment-id', () => ({ deploymentId: '1_46_2-0ca1769e' }));

const passedOn = new NextResponse('page', { status: 200 });
const proxy = deploymentSkewProxy(() => passedOn);

/**
 * A request the way the proxy receives it: Next.js has already removed the `RSC` and
 * `Next-Router-*` headers and the `_rsc` parameter, and kept `x-deployment-id`.
 */
const run = (headers: Record<string, string>): Promise<Response> =>
  Promise.resolve(
    proxy(
      new NextRequest('https://conveniat27.ch/app/chat', { headers }),
      {} as NextFetchEvent,
      NextResponse.next(),
    ),
  );

describe('deploymentSkewProxy', () => {
  /**
   * During a rolling release a prefetch from a page of one build reached a replica of the other.
   * Decoding that answer ran the other build's chunks in the page, which failed after the rollout.
   */
  it('answers a Flight request of a page of another build with an empty 409', async () => {
    const response = await run({ 'x-deployment-id': '1_46_1-6b1e0a2c' });

    expect(response.status).toBe(409);
    expect(response.headers.get('cache-control')).toBe('no-store');
    // a missing body reads as a failed fetch, which parks the navigation offline
    expect(response.body).not.toBeNull();
    expect(await response.text()).toBe('');
  });

  it('serves a Flight request of a page of this build', async () => {
    await expect(run({ 'x-deployment-id': '1_46_2-0ca1769e' })).resolves.toBe(passedOn);
  });

  it('serves a request without a deployment id: a document, or a page that predates them', async () => {
    await expect(run({})).resolves.toBe(passedOn);
  });

  it('serves a Server Function call of another build, which may carry a form submission', async () => {
    await expect(
      run({ 'x-deployment-id': '1_46_1-6b1e0a2c', 'next-action': '7f3a9c' }),
    ).resolves.toBe(passedOn);
  });
});
