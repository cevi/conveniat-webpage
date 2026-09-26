import { awaitMcpResponse } from '@/features/payload-cms/payload-cms/plugins/mcp/await-mcp-response';
import type { Config, Endpoint, PayloadHandler, PayloadRequest, Plugin } from 'payload';

/**
 * Mimics `mcp-handler`: the headers go out at once, the tool writes its answer later.
 */
const streamingHandler =
  (onToolFinished: () => void): PayloadHandler =>
  () =>
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller): void {
          setTimeout(() => {
            onToolFinished();
            controller.enqueue(new TextEncoder().encode('event: message\ndata: {"id":1}\n\n'));
            controller.close();
          }, 20);
        },
      }),
      { status: 200, headers: { 'content-type': 'text/event-stream' } },
    );

const okHandler: PayloadHandler = () => new Response('ok');

const pluginWith =
  (endpoints: Endpoint[]): Plugin =>
  (config: Config): Config => ({ ...config, endpoints });

const resolveEndpoint = async (plugin: Plugin, path: string): Promise<Endpoint> => {
  const config = await awaitMcpResponse(plugin)({} as Config);
  const endpoint = config.endpoints?.find((candidate) => candidate.path === path);
  if (!endpoint) throw new Error(`no endpoint at ${path}`);
  return endpoint;
};

describe('awaitMcpResponse', () => {
  it('returns from /mcp only after the tool has finished', async () => {
    let toolFinished = false;
    const endpoint = await resolveEndpoint(
      pluginWith([
        {
          path: '/mcp',
          method: 'post',
          handler: streamingHandler(() => (toolFinished = true)),
        },
      ]),
      '/mcp',
    );

    const response = await endpoint.handler({} as PayloadRequest);

    expect(toolFinished).toBe(true);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/event-stream');
    await expect(response.text()).resolves.toBe('event: message\ndata: {"id":1}\n\n');
  });

  it('keeps an empty acknowledgement empty', async () => {
    const endpoint = await resolveEndpoint(
      pluginWith([
        {
          path: '/mcp',
          method: 'post',
          handler: (): Response => new Response(undefined, { status: 202 }),
        },
      ]),
      '/mcp',
    );

    const response = await endpoint.handler({} as PayloadRequest);

    expect(response.status).toBe(202);
    expect(response.body).toBeNull();
  });

  it('leaves other endpoints alone', async () => {
    const endpoint = await resolveEndpoint(
      pluginWith([{ path: '/other', method: 'get', handler: okHandler }]),
      '/other',
    );

    expect(endpoint.handler).toBe(okHandler);
  });
});
