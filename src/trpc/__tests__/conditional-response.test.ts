import { withEntityTag } from '@/trpc/conditional-response';

const URL_ = 'https://example.test/api/trpc/schedule.getScheduleEntries';
const answer = (): Response =>
  new Response(JSON.stringify({ result: { data: ['entry'] } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('withEntityTag', () => {
  it('tags a query answer and keeps it out of shared caches', async () => {
    const response = await withEntityTag(new Request(URL_), answer());

    expect(response.status).toBe(200);
    expect(response.headers.get('ETag')).toMatch(/^"[\w-]+"$/);
    expect(response.headers.get('Cache-Control')).toBe('private, no-cache');
    expect(await response.json()).toEqual({ result: { data: ['entry'] } });
  });

  it('answers a client that holds the same answer with an empty 304', async () => {
    const first = await withEntityTag(new Request(URL_), answer());
    const entityTag = first.headers.get('ETag') ?? '';

    const response = await withEntityTag(
      new Request(URL_, { headers: { 'If-None-Match': entityTag } }),
      answer(),
    );

    expect(response.status).toBe(304);
    expect(await response.text()).toBe('');
  });

  it('accepts the weak tag a compressing proxy passes back', async () => {
    const first = await withEntityTag(new Request(URL_), answer());
    const weak = `W/${first.headers.get('ETag') ?? ''}`;

    const response = await withEntityTag(
      new Request(URL_, { headers: { 'If-None-Match': weak } }),
      answer(),
    );

    expect(response.status).toBe(304);
  });

  it('sends the whole answer once it changed', async () => {
    const response = await withEntityTag(
      new Request(URL_, { headers: { 'If-None-Match': '"an-older-answer"' } }),
      answer(),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ result: { data: ['entry'] } });
  });

  it('leaves mutations and failed answers as they are', async () => {
    const mutation = answer();
    const failed = new Response('{}', { status: 500 });

    expect(await withEntityTag(new Request(URL_, { method: 'POST' }), mutation)).toBe(mutation);
    expect(await withEntityTag(new Request(URL_), failed)).toBe(failed);
  });
});
