import type { Config, Endpoint, PayloadHandler, Plugin } from 'payload';

/**
 * Makes the MCP endpoint return only after the tool call has finished.
 *
 * `mcp-handler` hands Next.js a streaming `Response` as soon as the MCP transport writes its
 * headers, which is before the tool runs. Next.js applies the tags queued by `revalidateTag`
 * once, when the route handler returns. So `flushPageCacheOnChange` fires during an MCP
 * update, queues its tags after that point, and they are never applied: a page published
 * over MCP stays stale until its `cacheLife` runs out. The admin panel's REST write returns
 * after `payload.update` resolves, so the same hook works there.
 *
 * Reading the body to the end waits for the tool, and so for every hook it triggers. A
 * `tools/call` answer is a single message, so buffering it costs the client nothing.
 *
 * @param plugin - the configured `mcpPlugin`
 * @returns the plugin with its `/mcp` endpoints wrapped
 */
export const awaitMcpResponse =
  (plugin: Plugin): Plugin =>
  async (incomingConfig: Config): Promise<Config> => {
    const config = await plugin(incomingConfig);
    return {
      ...config,
      endpoints: (config.endpoints ?? []).map((endpoint: Endpoint): Endpoint =>
        endpoint.path === '/mcp'
          ? { ...endpoint, handler: bufferResponse(endpoint.handler) }
          : endpoint,
      ),
    };
  };

const bufferResponse =
  (handler: PayloadHandler): PayloadHandler =>
  async (request) => {
    const response = await handler(request);
    const body = await response.arrayBuffer();
    return new Response(body.byteLength > 0 ? body : undefined, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
